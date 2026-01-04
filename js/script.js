// --- 1. CONFIGURAÇÃO DO FIREBASE ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, where, updateDoc, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBiJxD6N-Y4tbEBBMM_RBCSOXuYpXEXMb0",
  authDomain: "fichavirtual-22960.firebaseapp.com",
  projectId: "fichavirtual-22960",
  storageBucket: "fichavirtual-22960.firebasestorage.app",
  messagingSenderId: "62340314104",
  appId: "1:62340314104:web:b15719eaca7365bf841c0d"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let editando = false;
let idFichaAtual = null; 

// --- 2. CADASTRO ---
const cadastroForm = document.getElementById('cadastroForm');
if (cadastroForm) {
    cadastroForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const email = document.getElementById('regEmail').value.trim();
        const pass = document.getElementById('regPass').value.trim();

        try {
            const q = query(collection(db, "usuarios"), where("email", "==", email));
            const snap = await getDocs(q);
            if (!snap.empty) { alert("E-mail já existe!"); return; }

            await addDoc(collection(db, "usuarios"), { email, senha: pass, cargo: "player", temFicha: false });
            localStorage.setItem('usuarioLogado', JSON.stringify({ email, cargo: "player", temFicha: false }));
            alert("Conta criada!");
            window.location.href = "pages/criar_ficha.html";
        } catch (error) { console.error(error); alert("Erro ao cadastrar."); }
    });
}

// --- 3. LOGIN ---
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const email = document.getElementById('email').value.trim();
        const pass = document.getElementById('password').value.trim();

        try {
            const q = query(collection(db, "usuarios"), where("email", "==", email), where("senha", "==", pass));
            const snap = await getDocs(q);
            if (snap.empty) { alert("Dados incorretos!"); return; }

            const user = snap.docs[0].data();
            localStorage.setItem('usuarioLogado', JSON.stringify(user));

            if (user.cargo === 'mestre') window.location.href = "pages/painel_mestre.html";
            else if (user.temFicha) window.location.href = "pages/visualizar_ficha.html";
            else window.location.href = "pages/criar_ficha.html";
        } catch (error) { console.error(error); alert("Erro de conexão."); }
    });
}

// --- 4. CRIAR FICHA ---
const fichaForm = document.getElementById('fichaForm');
if (fichaForm) {
    fichaForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const user = JSON.parse(localStorage.getItem('usuarioLogado'));
        if (!user) { alert("Login necessário"); return; }

        const getVal = (id) => parseInt(document.getElementById(id)?.value) || 0;
        const forca = getVal('str'); const destreza = getVal('dex'); const constituicao = getVal('con');
        const inteligencia = getVal('int'); const sabedoria = getVal('wis'); const carisma = getVal('cha');

        if(forca > 99 || destreza > 99 || constituicao > 99 || inteligencia > 99 || sabedoria > 99 || carisma > 99) {
            alert("⚠️ Atributos não podem passar de 99."); return;
        }

        const hpMax = getVal('hpMax') || 10;
        const dieType = document.getElementById('dieType')?.value || "d8";
        
        // --- NOVA LÓGICA DE IMAGEM ---
        const imgUrl = document.getElementById('imgUrl')?.value || "";
        // Pega a posição escolhida (top, center ou bottom)
        const imgPos = document.getElementById('imgPos')?.value || "center"; 

        const novaFicha = {
            dono: user.email,
            
            // Salvamos URL e Posição
            imagem: imgUrl,
            imagemPosicao: imgPos, 

            nome: document.getElementById('charName').value,
            nomeJogador: document.getElementById('playerName')?.value || user.email,
            antecedente: document.getElementById('background')?.value || "",
            alinhamento: document.getElementById('alignment')?.value || "Neutro",
            xp: getVal('xp'),

            classe: document.getElementById('charClass').value,
            raca: document.getElementById('charRace').value,
            nivel: 1, proficiencias: [],
            armadura: 10, movimento: "9m",
            
            vidaMaxima: hpMax, vidaAtual: hpMax, vidaTemporaria: 0,
            dadosVidaAtual: 1, dadosVidaTotal: "1" + dieType,

            atributos: { forca, destreza, constituicao, inteligencia, sabedoria, carisma }
        };

        try {
            await addDoc(collection(db, "fichas"), novaFicha);
            const q = query(collection(db, "usuarios"), where("email", "==", user.email));
            const snap = await getDocs(q);
            if (!snap.empty) {
                await updateDoc(doc(db, "usuarios", snap.docs[0].id), { temFicha: true });
                user.temFicha = true;
                localStorage.setItem('usuarioLogado', JSON.stringify(user));
            }
            window.location.href = "visualizar_ficha.html";
        } catch (error) { console.error(error); alert("Erro ao salvar."); }
    });
}

// --- 5. VISUALIZAR FICHA ---
const telaFicha = document.getElementById('visualizarFicha');
if (telaFicha) {
    carregarFicha();
    const btnEditar = document.getElementById('btnEditar');
    if(btnEditar) btnEditar.addEventListener('click', alternarEdicao);
}

async function carregarFicha() {
    const user = JSON.parse(localStorage.getItem('usuarioLogado'));
    if (!user) return;

    try {
        const q = query(collection(db, "fichas"), where("dono", "==", user.email));
        const snap = await getDocs(q);
        if (!snap.empty) {
            idFichaAtual = snap.docs[0].id; 
            const ficha = snap.docs[0].data();
            preencherTela(ficha);
        }
    } catch (error) { console.error(error); }
}

function preencherTela(ficha) {
    // --- VISUALIZAÇÃO DA IMAGEM ---
    const imgEl = document.getElementById('viewImg');
    imgEl.src = ficha.imagem ? ficha.imagem : "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png";
    
    // --- APLICA O ENQUADRAMENTO (POSIÇÃO) ---
    // Se tiver posição salva, usa. Se não, usa 'center' como padrão.
    const pos = ficha.imagemPosicao || 'center';
    imgEl.style.objectPosition = pos; // Aplica o estilo CSS diretamente na tag img
    
    imgEl.onerror = function() { 
        this.src = "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png"; 
    };

    // --- EDIÇÃO DA IMAGEM ---
    const imgEditContainer = document.getElementById('editImgContainer');
    if (editando) {
        // Mostra input de URL e o seletor de posição na edição
        const currentPos = ficha.imagemPosicao || 'center';
        imgEditContainer.innerHTML = `
            <div style="display:flex; gap:5px; margin-top:10px; justify-content:center;">
                <input type="text" id="input_img" class="input-atributo" style="width:70%; font-size:0.8rem; text-align:left;" placeholder="URL da imagem" value="${ficha.imagem || ''}">
                <select id="input_img_pos" class="input-atributo" style="width:25%; font-size:0.8rem;">
                    <option value="top" ${currentPos === 'top' ? 'selected' : ''}>Topo</option>
                    <option value="center" ${currentPos === 'center' ? 'selected' : ''}>Centro</option>
                    <option value="bottom" ${currentPos === 'bottom' ? 'selected' : ''}>Base</option>
                </select>
            </div>
        `;
    } else {
        imgEditContainer.innerHTML = '';
    }

    // --- RESTO DA FICHA ---
    document.getElementById('viewName').innerText = ficha.nome;
    
    const elPlayer = document.getElementById('viewPlayerName');
    const elBg = document.getElementById('viewBackground');
    const elAlign = document.getElementById('viewAlignment');
    const elXp = document.getElementById('viewXp');
    const elRace = document.getElementById('viewRace');
    const elClass = document.getElementById('viewClass');

    if (editando) {
        elPlayer.innerHTML = `<input type="text" id="input_player" class="input-atributo" style="width:100%; font-size:0.8rem" value="${ficha.nomeJogador || ''}">`;
        elBg.innerHTML = `<input type="text" id="input_bg" class="input-atributo" style="width:100%; font-size:0.8rem" value="${ficha.antecedente || ''}">`;
        elAlign.innerHTML = `<input type="text" id="input_align" class="input-atributo" style="width:100%; font-size:0.8rem" value="${ficha.alinhamento || ''}">`;
        elXp.innerHTML = `<input type="number" id="input_xp" class="input-atributo" style="width:60px; font-size:0.8rem" value="${ficha.xp || 0}">`;
    } else {
        elPlayer.innerText = ficha.nomeJogador || ficha.dono;
        elBg.innerText = ficha.antecedente || "-";
        elAlign.innerText = ficha.alinhamento || "-";
        elXp.innerText = ficha.xp || 0;
        elRace.innerText = ficha.raca;
        elClass.innerText = ficha.classe;
    }

    const elLevel = document.getElementById('viewLevel');
    if (editando) {
        elLevel.innerHTML = `<input type="number" id="input_level" class="input-atributo" style="width:40px; color:black;" value="${ficha.nivel || 1}">`;
    } else {
        elLevel.innerText = ficha.nivel || 1;
    }
    document.getElementById('viewProf').innerText = calcularProficiencia(ficha.nivel);

    renderCombate(ficha);
    renderVida(ficha);
    
    const modDex = calcularModificador(ficha.atributos.destreza);
    document.getElementById('viewInit').innerText = (modDex >= 0 ? "+" : "") + modDex;

    renderizarAtributo('viewStr', 'modStr', ficha.atributos.forca, "Força");
    renderizarAtributo('viewDex', 'modDex', ficha.atributos.destreza, "Destreza");
    renderizarAtributo('viewCon', 'modCon', ficha.atributos.constituicao, "Constituição");
    renderizarAtributo('viewInt', 'modInt', ficha.atributos.inteligencia, "Inteligência");
    renderizarAtributo('viewWis', 'modWis', ficha.atributos.sabedoria, "Sabedoria");
    renderizarAtributo('viewCha', 'modCha', ficha.atributos.carisma, "Carisma");

    atualizarSkills(ficha);
}

function renderCombate(ficha) {
    const elArmor = document.getElementById('viewArmor');
    const elSpeed = document.getElementById('viewSpeed');
    if (editando) {
        elArmor.innerHTML = `<input type="number" id="input_armor" class="input-atributo" style="width:50px" value="${ficha.armadura}">`;
        elSpeed.innerHTML = `<input type="text" id="input_speed" class="input-atributo" style="width:60px" value="${ficha.movimento}">`;
    } else {
        elArmor.innerText = ficha.armadura;
        elSpeed.innerText = ficha.movimento;
    }
}

function renderVida(ficha) {
    const ids = ['viewHpCurrent', 'viewHpMax', 'viewHpTemp', 'viewHdCur', 'viewHdTot'];
    const keys = ['vidaAtual', 'vidaMaxima', 'vidaTemporaria', 'dadosVidaAtual', 'dadosVidaTotal'];
    const defaults = [10, 10, 0, 1, '1d8'];

    ids.forEach((id, index) => {
        const el = document.getElementById(id);
        const val = ficha[keys[index]] !== undefined ? ficha[keys[index]] : defaults[index];
        if(editando) {
            const width = id === 'viewHdTot' ? '60px' : '50px';
            const type = id === 'viewHdTot' ? 'text' : 'number';
            el.innerHTML = `<input type="${type}" id="input_${keys[index]}" class="input-atributo" style="width:${width}" value="${val}">`;
        } else {
            el.innerText = val;
        }
    });
}

// --- 6. PAINEL DO MESTRE ---
const painelMestre = document.getElementById('listaDeJogadores');
if (painelMestre) {
    onSnapshot(collection(db, "fichas"), (snap) => {
        painelMestre.innerHTML = '';
        snap.forEach((d) => {
            const f = d.data();
            const card = document.createElement('div');
            card.className = 'player-card';
            const hp = f.vidaAtual !== undefined ? f.vidaAtual : "??";
            const hpMax = f.vidaMaxima || "??";
            
            // Miniatura da imagem no painel do mestre
            const imgUrl = f.imagem || "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png";
            // Aplica a mesma posição na miniatura do mestre
            const imgPos = f.imagemPosicao || 'center';

            card.innerHTML = `
                <div style="display:flex; align-items:center; gap:10px;">
                    <img src="${imgUrl}" style="width:50px; height:50px; border-radius:50%; object-fit:cover; object-position:${imgPos}; border:2px solid #333;">
                    <div>
                        <h3 style="margin:0; font-size:1.1rem;">${f.nome}</h3>
                        <p style="font-size:0.8rem; color:#555; margin:0;">${f.classe} (Nv. ${f.nivel})</p>
                    </div>
                </div>
                <div style="margin-top:10px; border-top:1px solid #eee; padding-top:5px; display:flex; justify-content:space-between;">
                    <span>🛡️ CA: <strong>${f.armadura || 10}</strong></span>
                    <span style="color:#dc3545">❤ HP: <strong>${hp}/${hpMax}</strong></span>
                </div>
                <div style="margin-top:5px; font-size:0.75rem; color:#888;">
                    Jog: ${f.nomeJogador || f.dono}
                </div>
            `;
            painelMestre.appendChild(card);
        });
    });
}

// --- SALVAR EDIÇÃO ---
async function alternarEdicao() {
    const btn = document.getElementById('btnEditar');
    
    if (!editando) {
        editando = true;
        btn.innerText = "💾 Salvar";
        btn.style.backgroundColor = "#28a745";
        btn.style.color = "white";
        carregarFicha(); 
    } else {
        if (!idFichaAtual) return;
        
        const getVal = (id) => parseInt(document.getElementById(id)?.value) || 0;
        const f = getVal('input_viewStr'); const d = getVal('input_viewDex');
        const c = getVal('input_viewCon'); const i = getVal('input_viewInt');
        const w = getVal('input_viewWis'); const ch = getVal('input_viewCha');

        if(f>99||d>99||c>99||i>99||w>99||ch>99) { alert("Atributos máx 99"); return; }

        btn.innerText = "⏳ ...";

        try {
            const updates = {
                atributos: { forca:f, destreza:d, constituicao:c, inteligencia:i, sabedoria:w, carisma:ch },
                
                // SALVA A URL E A NOVA POSIÇÃO NA EDIÇÃO
                imagem: document.getElementById('input_img').value,
                imagemPosicao: document.getElementById('input_img_pos').value,

                nomeJogador: document.getElementById('input_player').value,
                antecedente: document.getElementById('input_bg').value,
                alinhamento: document.getElementById('input_align').value,
                xp: parseInt(document.getElementById('input_xp').value) || 0,

                nivel: parseInt(document.getElementById('input_level').value) || 1,
                armadura: document.getElementById('input_armor').value,
                movimento: document.getElementById('input_speed').value,
                vidaAtual: parseInt(document.getElementById('input_vidaAtual').value),
                vidaMaxima: parseInt(document.getElementById('input_vidaMaxima').value),
                vidaTemporaria: parseInt(document.getElementById('input_vidaTemporaria').value),
                dadosVidaAtual: parseInt(document.getElementById('input_dadosVidaAtual').value),
                dadosVidaTotal: document.getElementById('input_dadosVidaTotal').value
            };

            await updateDoc(doc(db, "fichas", idFichaAtual), updates);
            editando = false;
            btn.innerText = "✏️ Editar";
            btn.style.backgroundColor = "#ffc107";
            btn.style.color = "#333";
            carregarFicha();
            alert("Ficha atualizada!");
        } catch (error) { console.error(error); alert("Erro ao salvar."); btn.innerText = "💾 Salvar"; }
    }
}

// --- CÁLCULOS ---
function calcularModificador(v) { return Math.floor((v - 10) / 2); }
function calcularProficiencia(n) { return "+" + (Math.floor((n - 1) / 4) + 2); }

function renderizarAtributo(idVal, idMod, val, nome) {
    const elVal = document.getElementById(idVal);
    const elMod = document.getElementById(idMod);
    const v = parseInt(val);
    const m = calcularModificador(v);
    
    if (editando) {
        elVal.innerHTML = `<input type="number" id="input_${idVal}" class="input-atributo" value="${v}">`;
        elVal.onclick = null; elMod.onclick = null;
    } else {
        elVal.innerHTML = v;
        elVal.style.cursor = "pointer"; elMod.style.cursor = "pointer";
        elVal.onclick = () => rolarDado(nome, m);
        elMod.onclick = () => rolarDado(nome, m);
    }
    elMod.innerText = `(${m >= 0 ? "+" + m : m})`;
}

function atualizarSkills(ficha) {
    const attr = ficha.atributos;
    const prof = parseInt(calcularProficiencia(ficha.nivel));
    if (ficha.proficiencias) {
        ficha.proficiencias.forEach(id => {
            const el = document.getElementById(id);
            if(el) el.checked = true;
        });
    }
    const mods = {
        str: calcularModificador(attr.forca), dex: calcularModificador(attr.destreza),
        con: calcularModificador(attr.constituicao), int: calcularModificador(attr.inteligencia),
        wis: calcularModificador(attr.sabedoria), cha: calcularModificador(attr.carisma)
    };
    const lista = [
        ["saveStr", "chk_saveStr", mods.str], ["saveDex", "chk_saveDex", mods.dex],
        ["saveCon", "chk_saveCon", mods.con], ["saveInt", "chk_saveInt", mods.int],
        ["saveWis", "chk_saveWis", mods.wis], ["saveCha", "chk_saveCha", mods.cha],
        ["skillAcro", "chk_acro", mods.dex], ["skillAni", "chk_ani", mods.wis],
        ["skillArc", "chk_arc", mods.int], ["skillAth", "chk_ath", mods.str],
        ["skillDec", "chk_dec", mods.cha], ["skillHis", "chk_his", mods.int],
        ["skillIns", "chk_ins", mods.wis], ["skillIntim", "chk_intim", mods.cha],
        ["skillInv", "chk_inv", mods.int], ["skillMed", "chk_med", mods.wis],
        ["skillNat", "chk_nat", mods.int], ["skillPerc", "chk_perc", mods.wis],
        ["skillPerf", "chk_perf", mods.cha], ["skillPers", "chk_pers", mods.cha],
        ["skillRel", "chk_rel", mods.int], ["skillSle", "chk_sle", mods.dex],
        ["skillSte", "chk_ste", mods.dex], ["skillSur", "chk_sur", mods.wis]
    ];
    lista.forEach(item => configurarLinha(item[0], item[1], item[2], prof));
}

function configurarLinha(idTxt, idChk, modBase, profBonus) {
    const elTxt = document.getElementById(idTxt);
    let elChk = document.getElementById(idChk); 
    if (!elTxt) return;
    let nomeSkill = "Perícia";
    if (elTxt.previousElementSibling?.className === "skill-name") nomeSkill = elTxt.previousElementSibling.innerText;
    else if (elTxt.previousElementSibling?.previousElementSibling) nomeSkill = elTxt.previousElementSibling.previousElementSibling.innerText;

    const novoChk = elChk.cloneNode(true);
    elChk.parentNode.replaceChild(novoChk, elChk);
    elChk = novoChk; 

    async function calcularESalvar(e) {
        let final = parseInt(modBase);
        if (elChk.checked) final += profBonus; 
        const txt = final >= 0 ? "+" + final : final;
        elTxt.innerText = txt;
        elTxt.style.color = (elChk.checked) ? "#0056b3" : "#007bff";
        if (e && e.type === 'change') { await salvarProficiencias(); }
        elTxt.onclick = () => rolarDado(nomeSkill, final);
    }
    calcularESalvar();
    elChk.addEventListener('change', calcularESalvar);
}

async function salvarProficiencias() {
    if (!idFichaAtual) return;
    const checkboxes = document.querySelectorAll('.prof-check');
    const marcados = [];
    checkboxes.forEach(chk => { if (chk.checked) marcados.push(chk.id); });
    try { await updateDoc(doc(db, "fichas", idFichaAtual), { proficiencias: marcados }); } 
    catch (error) { console.error(error); }
}

function rolarDado(nome, mod) {
    if (editando) return;
    const d20 = Math.floor(Math.random() * 20) + 1;
    const total = d20 + mod;
    let msg = ""; if (d20 === 20) msg = " 🔥 CRÍTICO!"; if (d20 === 1) msg = " 💀 FALHA CRÍTICA!";
    alert(`🎲 ${nome}\nDado: ${d20}\nMod: ${mod}\nTotal: ${total}${msg}`);
}