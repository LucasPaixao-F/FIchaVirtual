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

// Variáveis Globais
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
        if (!user) return;

        const novaFicha = {
            dono: user.email,
            nome: document.getElementById('charName').value,
            classe: document.getElementById('charClass').value,
            raca: document.getElementById('charRace').value,
            nivel: 1, proficiencias: [],
            atributos: {
                forca: document.getElementById('str').value,
                destreza: document.getElementById('dex').value,
                constituicao: document.getElementById('con').value,
                inteligencia: document.getElementById('int').value,
                sabedoria: document.getElementById('wis').value,
                carisma: document.getElementById('cha').value
            }
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
        } catch (error) { console.error(error); }
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
            const docRef = snap.docs[0];
            idFichaAtual = docRef.id; 
            const ficha = docRef.data();
            preencherTela(ficha);
        }
    } catch (error) { console.error(error); }
}

function preencherTela(ficha) {
    document.getElementById('viewName').innerText = ficha.nome;
    document.getElementById('viewClass').innerText = ficha.classe;
    document.getElementById('viewRace').innerText = ficha.raca;
    document.getElementById('viewLevel').innerText = ficha.nivel;
    document.getElementById('viewProf').innerText = calcularProficiencia(ficha.nivel);

    renderizarAtributo('viewStr', 'modStr', ficha.atributos.forca, "Força");
    renderizarAtributo('viewDex', 'modDex', ficha.atributos.destreza, "Destreza");
    renderizarAtributo('viewCon', 'modCon', ficha.atributos.constituicao, "Constituição");
    renderizarAtributo('viewInt', 'modInt', ficha.atributos.inteligencia, "Inteligência");
    renderizarAtributo('viewWis', 'modWis', ficha.atributos.sabedoria, "Sabedoria");
    renderizarAtributo('viewCha', 'modCha', ficha.atributos.carisma, "Carisma");

    atualizarSkills(ficha);
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
            card.innerHTML = `<h3>${f.nome}</h3><p>${f.classe} (Nv. ${f.nivel})</p><p>${f.raca}</p><span class="tag-player">${f.dono}</span>`;
            painelMestre.appendChild(card);
        });
    });
}

// --- FUNÇÕES AUXILIARES ---

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
        btn.innerText = "⏳ ...";
        
        try {
            const novosAtributos = {
                forca: document.getElementById('input_viewStr').value,
                destreza: document.getElementById('input_viewDex').value,
                constituicao: document.getElementById('input_viewCon').value,
                inteligencia: document.getElementById('input_viewInt').value,
                sabedoria: document.getElementById('input_viewWis').value,
                carisma: document.getElementById('input_viewCha').value
            };

            await updateDoc(doc(db, "fichas", idFichaAtual), { atributos: novosAtributos });
            
            editando = false;
            btn.innerText = "✏️ Editar";
            btn.style.backgroundColor = "#ffc107";
            btn.style.color = "#333";
            carregarFicha();
            alert("Atributos salvos!");
        } catch (error) { console.error(error); alert("Erro ao salvar."); editando = false; }
    }
}

function calcularModificador(valor) { return Math.floor((valor - 10) / 2); }
function calcularProficiencia(nivel) { return "+" + (Math.floor((nivel - 1) / 4) + 2); }

function renderizarAtributo(idVal, idMod, valor, nome) {
    const elVal = document.getElementById(idVal);
    const elMod = document.getElementById(idMod);
    const val = parseInt(valor);
    const mod = calcularModificador(val);
    const txtMod = mod >= 0 ? "+" + mod : mod;

    if (editando) {
        elVal.innerHTML = `<input type="number" id="input_${idVal}" class="input-atributo" value="${val}">`;
        elVal.onclick = null; elMod.onclick = null;
    } else {
        elVal.innerHTML = val;
        elVal.style.cursor = "pointer"; elMod.style.cursor = "pointer";
        elVal.onclick = () => rolarDado(nome, mod);
        elMod.onclick = () => rolarDado(nome, mod);
    }
    elMod.innerText = `(${txtMod})`;
}

// --- CÁLCULO DE PERÍCIAS ---
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

// --- FUNÇÃO CORRIGIDA ---
function configurarLinha(idTxt, idChk, modBase, profBonus) {
    const elTxt = document.getElementById(idTxt);
    // Mudamos 'const' para 'let' para poder atualizar a referência
    let elChk = document.getElementById(idChk); 
    if (!elTxt) return;

    let nomeSkill = "Perícia";
    if (elTxt.previousElementSibling?.className === "skill-name") nomeSkill = elTxt.previousElementSibling.innerText;
    else if (elTxt.previousElementSibling?.previousElementSibling) nomeSkill = elTxt.previousElementSibling.previousElementSibling.innerText;

    // --- CORREÇÃO DO LISTENER ---
    // Clonamos o checkbox para limpar listeners antigos
    const novoChk = elChk.cloneNode(true);
    elChk.parentNode.replaceChild(novoChk, elChk);
    
    // ATUALIZAMOS A VARIÁVEL PARA APONTAR PARA O NOVO ELEMENTO!
    elChk = novoChk; 

    async function calcularESalvar(e) {
        // Visual
        let final = parseInt(modBase);
        if (elChk.checked) final += profBonus; // Agora usa o elChk correto
        
        const txt = final >= 0 ? "+" + final : final;
        elTxt.innerText = txt;
        elTxt.style.color = (elChk.checked) ? "#0056b3" : "#007bff";

        // Salvar (apenas se for evento de mudança)
        if (e && e.type === 'change') {
            await salvarProficiencias(); 
        }

        // Atualiza rolagem
        elTxt.onclick = () => rolarDado(nomeSkill, final);
    }

    // Roda inicial (sem evento, só visual)
    calcularESalvar();

    // Adiciona listener no novo elemento
    elChk.addEventListener('change', calcularESalvar);
}

async function salvarProficiencias() {
    if (!idFichaAtual) return;
    
    const checkboxes = document.querySelectorAll('.prof-check');
    const marcados = [];
    checkboxes.forEach(chk => {
        if (chk.checked) marcados.push(chk.id);
    });

    try {
        await updateDoc(doc(db, "fichas", idFichaAtual), { proficiencias: marcados });
        console.log("Proficiências salvas!");
    } catch (error) { console.error("Erro ao salvar prof:", error); }
}

function rolarDado(nome, mod) {
    if (editando) return;
    const d20 = Math.floor(Math.random() * 20) + 1;
    const total = d20 + mod;
    let msg = ""; if (d20 === 20) msg = " 🔥 CRÍTICO!"; if (d20 === 1) msg = " 💀 FALHA CRÍTICA!";
    alert(`🎲 ${nome}\nDado: ${d20}\nMod: ${mod}\nTotal: ${total}${msg}`);
}