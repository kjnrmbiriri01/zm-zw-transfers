// WhatsApp Floating Button - Money Transfer (Zambia <-> Zimbabwe)
(function() {
    // Agents clients can message
    const agents = {
        kevin:    { name: "Kevin",    phone: "260762254613" },
        munashe:  { name: "Munashe",  phone: "260574821672" }
    };

    // Fee tiers - mirrors the main calculator (index.html): $2 flat (<=32), $3 flat (34-60), else 5%
    // Special cases: $33 is a flat $2.50, $105 is a flat $5 promo (overrides the normal 5% tiers)
    function calcFee(usdAmount) {
        if (usdAmount === 33) return 2.5;
        if (usdAmount === 105) return 5;
        if (usdAmount <= 32) return 2;
        if (usdAmount <= 60) return 3;
        return usdAmount * 0.05;
    }

    // Pulls the live rate from the page's calculator if present (window.rate, set in index.html),
    // otherwise falls back to a safe default so the widget still works standalone.
    function getRate() {
        if (typeof window.rate === 'number' && window.rate > 0) return window.rate;
        // Fallback: read the live rate straight off the page's own rate display
        const el = document.getElementById('rn1') || document.getElementById('d1');
        if (el) {
            const v = parseFloat(el.textContent.replace(/,/g, ''));
            if (!isNaN(v) && v > 0) return v;
        }
        return 20;
    }

    // State
    let selectedAgent = 'kevin';
    let direction = 'a'; // 'a' = Zimbabwe -> Zambia (send USD, receive ZMW), 'b' = Zambia -> Zimbabwe (send ZMW, receive USD)
    let lastEdited = 'send'; // which field the client typed in last, so we know which to recompute
    let enquiryMode = false; // true when the client entered 0, meaning "I just want to ask about how it works"

    function computeFromSend(sendVal) {
        const R = getRate();
        if (direction === 'a') {
            // Sending USD from Zimbabwe -> receiving ZMW in Zambia
            const fee = calcFee(sendVal);
            const net = sendVal - fee;
            const receive = net * R;
            return { fee, receive, sendCurrency: 'USD', receiveCurrency: 'ZMW' };
        } else {
            // Sending ZMW from Zambia -> receiving USD in Zimbabwe
            const usdEquiv = sendVal / R;
            const fee = calcFee(usdEquiv);
            const receive = usdEquiv - fee;
            return { fee, receive, sendCurrency: 'ZMW', receiveCurrency: 'USD' };
        }
    }

    function computeFromReceive(receiveVal) {
        const R = getRate();
        if (direction === 'a') {
            // Client wants recipient to get receiveVal ZMW in Zambia -> figure out USD to send from Zimbabwe
            let principal, fee;
            let t = (receiveVal / R) + 2;
            if (t <= 32) { principal = t; fee = 2; }
            else {
                t = (receiveVal / R) + 3;
                if (t <= 60) { principal = t; fee = 3; }
                else { principal = receiveVal / (0.95 * R); fee = principal * 0.05; }
            }
            return { fee, send: principal, sendCurrency: 'USD', receiveCurrency: 'ZMW' };
        } else {
            // Client wants recipient to get receiveVal USD in Zimbabwe -> figure out ZMW to send from Zambia
            const R2 = getRate();
            let principalUsd, fee;
            let t = receiveVal + 2;
            if (t <= 32) { principalUsd = t; fee = 2; }
            else {
                t = receiveVal + 3;
                if (t <= 60) { principalUsd = t; fee = 3; }
                else { principalUsd = receiveVal / 0.95; fee = principalUsd - receiveVal; }
            }
            return { fee, send: principalUsd * R2, sendCurrency: 'ZMW', receiveCurrency: 'USD' };
        }
    }

    function fmt(n) {
        if (isNaN(n) || n === null) return '';
        return n.toFixed(2);
    }

    function buildMessage() {
        const agent = agents[selectedAgent];
        const sendInput = document.getElementById('wsp-send-amt');
        const receiveInput = document.getElementById('wsp-receive-amt');
        const sendVal = parseFloat(sendInput.value);
        const receiveVal = parseFloat(receiveInput.value);
        const dirLabel = direction === 'a' ? 'Zimbabwe to Zambia' : 'Zambia to Zimbabwe';
        const sendCur = direction === 'a' ? 'USD' : 'ZMW';
        const receiveCur = direction === 'a' ? 'ZMW' : 'USD';

        if (enquiryMode) {
            return `Hi ${agent.name}, I'd like to enquire about how the money transfer service works.`;
        }

        if (!sendVal || !receiveVal) {
            return `Hi ${agent.name}, I'd like to send money from ${dirLabel}. Can you help me with the rate and fees?`;
        }

        return `Hi ${agent.name}, I'd like to send money from ${dirLabel}.\nSending: ${fmt(sendVal)} ${sendCur}\nRecipient should get: ${fmt(receiveVal)} ${receiveCur}\nPlease confirm the current rate and fee.`;
    }

    function recalc() {
        const sendInput = document.getElementById('wsp-send-amt');
        const receiveInput = document.getElementById('wsp-receive-amt');
        const feeNote = document.getElementById('wsp-fee-note');
        const ENQUIRY_NOTE = "💬 We'll send a general enquiry message instead of an amount.";

        if (lastEdited === 'send') {
            const raw = sendInput.value;
            if (raw === '') { receiveInput.value = ''; feeNote.textContent = ''; enquiryMode = false; return; }
            const v = parseFloat(raw);
            if (v === 0) { receiveInput.value = ''; feeNote.textContent = ENQUIRY_NOTE; enquiryMode = true; return; }
            enquiryMode = false;
            if (!v || v < 0) { receiveInput.value = ''; feeNote.textContent = ''; return; }
            const r = computeFromSend(v);
            receiveInput.value = fmt(r.receive);
            feeNote.textContent = `Fee: ${fmt(r.fee)} ${r.sendCurrency}`;
        } else {
            const raw = receiveInput.value;
            if (raw === '') { sendInput.value = ''; feeNote.textContent = ''; enquiryMode = false; return; }
            const v = parseFloat(raw);
            if (v === 0) { sendInput.value = ''; feeNote.textContent = ENQUIRY_NOTE; enquiryMode = true; return; }
            enquiryMode = false;
            if (!v || v < 0) { sendInput.value = ''; feeNote.textContent = ''; return; }
            const r = computeFromReceive(v);
            sendInput.value = fmt(r.send);
            feeNote.textContent = `Fee: ${fmt(r.fee)} ${r.sendCurrency}`;
        }
    }

    function updateDirectionLabels() {
        const sendLabel = document.getElementById('wsp-send-label');
        const receiveLabel = document.getElementById('wsp-receive-label');
        const sendSym = document.getElementById('wsp-send-sym');
        const receiveSym = document.getElementById('wsp-receive-sym');
        if (direction === 'a') {
            sendLabel.textContent = "Sending from Zimbabwe";
            receiveLabel.textContent = "They receive in Zambia";
            sendSym.textContent = '$';
            receiveSym.textContent = 'ZK';
        } else {
            sendLabel.textContent = "Sending from Zambia";
            receiveLabel.textContent = "They receive in Zimbabwe";
            sendSym.textContent = 'ZK';
            receiveSym.textContent = '$';
        }
    }

    function setAgent(key) {
        selectedAgent = key;
        document.getElementById('wsp-agent-kevin').classList.toggle('wsp-active', key === 'kevin');
        document.getElementById('wsp-agent-munashe').classList.toggle('wsp-active', key === 'munashe');
    }

    function setDirection(dir) {
        direction = dir;
        document.getElementById('wsp-dir-a').classList.toggle('wsp-active', dir === 'a');
        document.getElementById('wsp-dir-b').classList.toggle('wsp-active', dir === 'b');
        updateDirectionLabels();
        document.getElementById('wsp-send-amt').value = '';
        document.getElementById('wsp-receive-amt').value = '';
        document.getElementById('wsp-fee-note').textContent = '';
        enquiryMode = false;
    }

    function createFloatingButton() {
        const fab = document.createElement('div');
        fab.id = 'whatsapp-fab';
        fab.innerHTML = `
            <div class="wsp-fab-inner">
                <i class="fab fa-whatsapp"></i>
                <span>Send Money</span>
            </div>
        `;

        const popup = document.createElement('div');
        popup.id = 'whatsapp-popup';
        popup.innerHTML = `
            <div class="wsp-popup-header">
                <i class="fab fa-whatsapp"></i>
                <span>Send via WhatsApp</span>
                <button id="wsp-close">&times;</button>
            </div>
            <div class="wsp-popup-body">
                <label>Who would you like to message?</label>
                <div class="wsp-toggle-row">
                    <button id="wsp-agent-kevin" class="wsp-toggle wsp-active">Kevin</button>
                    <button id="wsp-agent-munashe" class="wsp-toggle">Munashe</button>
                </div>

                <label>Direction</label>
                <div class="wsp-toggle-row">
                    <button id="wsp-dir-a" class="wsp-toggle wsp-active">Zimbabwe → Zambia</button>
                    <button id="wsp-dir-b" class="wsp-toggle">Zambia → Zimbabwe</button>
                </div>

                <div class="wsp-tip">💡 Put <strong>0</strong> if you'd just like to enquire about how everything works.</div>

                <label id="wsp-send-label">Sending from Zimbabwe</label>
                <div class="wsp-ir"><div class="wsp-ig"><span class="wsp-sy" id="wsp-send-sym">$</span><input type="number" id="wsp-send-amt" placeholder="0.00" /></div></div>

                <label id="wsp-receive-label">They receive in Zambia</label>
                <div class="wsp-ir"><div class="wsp-ig"><span class="wsp-sy" id="wsp-receive-sym">ZK</span><input type="number" id="wsp-receive-amt" placeholder="0.00" /></div></div>

                <div id="wsp-fee-note" class="wsp-fee-note"></div>

                <button id="wsp-send">
                    <i class="fab fa-whatsapp"></i> Send via WhatsApp
                </button>
                <p class="wsp-note">You'll be redirected to WhatsApp to confirm details and complete the transfer.</p>
            </div>
        `;

        document.body.appendChild(fab);
        document.body.appendChild(popup);

        const style = document.createElement('style');
        style.textContent = `
            #whatsapp-fab {
                position: fixed;
                bottom: 24px;
                right: 24px;
                z-index: 9999;
                cursor: pointer;
                transition: transform 0.3s ease;
            }
            #whatsapp-fab:hover {
                transform: scale(1.05);
            }
            .wsp-fab-inner {
                display: flex;
                align-items: center;
                gap: 10px;
                background: linear-gradient(135deg, #25D366, #128C7E);
                color: white;
                padding: 14px 24px;
                border-radius: 50px;
                box-shadow: 0 6px 30px rgba(37, 211, 102, 0.4);
                font-weight: 600;
                font-size: 1rem;
                font-family: 'Inter', sans-serif;
            }
            .wsp-fab-inner i {
                font-size: 1.4rem;
            }

            #whatsapp-popup {
                position: fixed;
                bottom: 90px;
                right: 24px;
                width: 340px;
                max-height: 80vh;
                overflow-y: auto;
                background: white;
                border-radius: 16px;
                box-shadow: 0 10px 50px rgba(0,0,0,0.2);
                z-index: 9998;
                opacity: 0;
                visibility: hidden;
                transform: translateY(20px) scale(0.95);
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                font-family: 'Inter', sans-serif;
            }
            #whatsapp-popup.active {
                opacity: 1;
                visibility: visible;
                transform: translateY(0) scale(1);
            }
            .wsp-popup-header {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 16px 20px;
                background: linear-gradient(135deg, #25D366, #128C7E);
                color: white;
                font-weight: 600;
                font-size: 1rem;
                position: sticky;
                top: 0;
            }
            .wsp-popup-header i {
                font-size: 1.3rem;
            }
            .wsp-popup-header button {
                margin-left: auto;
                background: none;
                border: none;
                color: white;
                font-size: 1.5rem;
                cursor: pointer;
                opacity: 0.8;
                padding: 0 4px;
            }
            .wsp-popup-header button:hover {
                opacity: 1;
            }
            .wsp-popup-body {
                padding: 20px;
            }
            .wsp-popup-body label {
                display: block;
                font-size: 0.82rem;
                font-weight: 600;
                color: #333;
                margin-bottom: 6px;
                margin-top: 4px;
            }
            .wsp-toggle-row {
                display: flex;
                gap: 8px;
                margin-bottom: 14px;
            }
            .wsp-toggle {
                flex: 1;
                padding: 9px 8px;
                border: 1.5px solid #e0e0e0;
                border-radius: 8px;
                background: white;
                color: #333;
                font-size: 0.82rem;
                font-weight: 600;
                cursor: pointer;
                font-family: 'Inter', sans-serif;
                transition: all 0.2s;
            }
            .wsp-toggle.wsp-active {
                background: linear-gradient(135deg, #25D366, #128C7E);
                border-color: #128C7E;
                color: white;
            }
            .wsp-ir {
                margin-bottom: 14px;
            }
            .wsp-ig {
                display: flex;
                align-items: center;
                border: 1.5px solid #e0e0e0;
                border-radius: 8px;
                overflow: hidden;
            }
            .wsp-ig .wsp-sy {
                flex: 0 0 auto;
                padding: 11px 12px;
                background: #f5f5f5;
                font-weight: 600;
                color: #555;
                font-size: 0.9rem;
                white-space: nowrap;
            }
            .wsp-ig input {
                flex: 1;
                min-width: 0;
                border: none;
                padding: 11px 14px;
                font-size: 0.9rem;
                outline: none;
                font-family: 'Inter', sans-serif;
            }
            .wsp-ig:focus-within {
                border-color: #25D366;
            }
            .wsp-tip {
                font-size: 0.78rem;
                color: #555;
                background: #f0faf4;
                border: 1px solid #d5efe0;
                border-radius: 8px;
                padding: 8px 10px;
                margin-bottom: 14px;
                line-height: 1.4;
            }
            .wsp-fee-note {
                font-size: 0.8rem;
                color: #128C7E;
                font-weight: 600;
                margin: -6px 0 14px;
                min-height: 1em;
            }
            #wsp-send {
                width: 100%;
                padding: 13px;
                background: linear-gradient(135deg, #25D366, #128C7E);
                color: white;
                border: none;
                border-radius: 8px;
                font-size: 0.95rem;
                font-weight: 600;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                transition: opacity 0.2s;
                font-family: 'Inter', sans-serif;
            }
            #wsp-send:hover {
                opacity: 0.9;
            }
            .wsp-note {
                font-size: 0.78rem !important;
                color: #999 !important;
                margin-top: 12px !important;
                margin-bottom: 0 !important;
                text-align: center;
            }

            @media (max-width: 480px) {
                #whatsapp-popup {
                    width: calc(100% - 32px);
                    right: 16px;
                    bottom: 85px;
                }
                .wsp-fab-inner {
                    padding: 12px 18px;
                    font-size: 0.9rem;
                }
            }
        `;

        document.head.appendChild(style);

        // Event listeners
        fab.addEventListener('click', () => {
            popup.classList.toggle('active');
        });

        document.getElementById('wsp-close').addEventListener('click', () => {
            popup.classList.remove('active');
        });

        document.getElementById('wsp-agent-kevin').addEventListener('click', () => setAgent('kevin'));
        document.getElementById('wsp-agent-munashe').addEventListener('click', () => setAgent('munashe'));
        document.getElementById('wsp-dir-a').addEventListener('click', () => setDirection('a'));
        document.getElementById('wsp-dir-b').addEventListener('click', () => setDirection('b'));

        document.getElementById('wsp-send-amt').addEventListener('input', () => {
            lastEdited = 'send';
            recalc();
        });
        document.getElementById('wsp-receive-amt').addEventListener('input', () => {
            lastEdited = 'receive';
            recalc();
        });

        document.getElementById('wsp-send').addEventListener('click', () => {
            const agent = agents[selectedAgent];
            const message = buildMessage();
            const url = `https://wa.me/${agent.phone}?text=${encodeURIComponent(message)}`;
            window.open(url, '_blank');
            popup.classList.remove('active');
        });

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!fab.contains(e.target) && !popup.contains(e.target)) {
                popup.classList.remove('active');
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createFloatingButton);
    } else {
        createFloatingButton();
    }
})();
