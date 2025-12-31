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

        const forca = parseInt(document.getElementById('str').value) || 0;
        const destreza = parseInt(document.getElementById('dex').value) || 0;
        const constituicao = parseInt(document.getElementById('con').value) || 0;
        const inteligencia = parseInt(document.getElementById('int').value) || 0;
        const sabedoria = parseInt(document.getElementById('wis').value) || 0;
        const carisma = parseInt(document.getElementById('cha').value) || 0;

        if(forca > 99 || destreza > 99 || constituicao > 99 || inteligencia > 99 || sabedoria > 99 || carisma > 99) {
            alert("⚠️ Nenhum atributo pode ser maior que 99.");
            return;
        }

        const hpMax = parseInt(document.getElementById('hpMax').value) || 10;
        const tipoDado = document.getElementById('dieType').value || "d8";

        const novaFicha = {
            dono: user.email,
            nome: document.getElementById('charName').value,
            classe: document.getElementById('charClass').value,
            raca: document.getElementById('charRace').value,
            nivel: 1, proficiencias: [],
            
            armadura: document.getElementById('armor').value || 10,
            movimento: document.getElementById('speed').value || "9m",
            
            // VIDA E DADOS DE VIDA
            vidaMaxima: hpMax, vidaAtual: hpMax, vidaTemporaria: 0,
            dadosVidaAtual: 1, dadosVidaTotal: "1" + tipoDado,

            atributos: {
                forca: forca, destreza: destreza, constituicao: constituicao,
                inteligencia: inteligencia, sabedoria: sabedoria, carisma: carisma
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
    
    // Nível e Proficiência
    const elLevel = document.getElementById('viewLevel');
    const valLevel = ficha.nivel || 1;
    if (editando) {
        elLevel.innerHTML = `<input type="number" id="input_level" class="input-atributo" style="width:40px; color:black;" value="${valLevel}">`;
    } else {
        elLevel.innerText = valLevel;
    }
    document.getElementById('viewProf').innerText = calcularProficiencia(ficha.nivel);
    
    // Armadura e Movimento
    const elArmor = document.getElementById('viewArmor');
    const elSpeed = document.getElementById('viewSpeed');
    const valArmor = ficha.armadura || 10;
    const valSpeed = ficha.movimento || "9m";

    if (editando) {
        elArmor.innerHTML = `<input type="number" id="input_armor" class="input-atributo" style="width:50px" value="${valArmor}">`;
        elSpeed.innerHTML = `<input type="text" id="input_speed" class="input-atributo" style="width:60px" value="${valSpeed}">`;
    } else {
        elArmor.innerText = valArmor;
        elSpeed.innerText = valSpeed;
    }

    // --- VIDA E DADOS DE VIDA ---
    const elHpCur = document.getElementById('viewHpCurrent');
    const elHpMax = document.getElementById('viewHpMax');
    const elHpTemp = document.getElementById('viewHpTemp');
    const elHdCur = document.getElementById('viewHdCur'); // Dado Atual (Núm)
    const elHdTot = document.getElementById('viewHdTot'); // Dado Total (Texto)
    
    const valHpCur = ficha.vidaAtual !== undefined ? ficha.vidaAtual : 10;
    const valHpMax = ficha.vidaMaxima || 10;
    const valHpTemp = ficha.vidaTemporaria || 0;
    const valHdCur = ficha.dadosVidaAtual !== undefined ? ficha.dadosVidaAtual : 1;
    const valHdTot = ficha.dadosVidaTotal || "1d8";

    if (editando) {
        elHpCur.innerHTML = `<input type="number" id="input_hpCur" class="input-atributo" style="width:50px; border-color:#dc3545;" value="${valHpCur}">`;
        elHpMax.innerHTML = `<input type="number" id="input_hpMax" class="input-atributo" style="width:50px; border-color:#dc3545;" value="${valHpMax}">`;
        elHpTemp.innerHTML = `<input type="number" id="input_hpTemp" class="input-atributo" style="width:50px; border-color:#17a2b8;" value="${valHpTemp}">`;
        
        // Edição dos Dados de Vida
        elHdCur.innerHTML = `<input type="number" id="input_hdCur" class="input-atributo" style="width:40px; border-color:#6610f2;" value="${valHdCur}">`;
        elHdTot.innerHTML = `<input type="text" id="input_hdTot" class="input-atributo" style="width:50px; font-size:0.8rem;" value="${valHdTot}">`;
    } else {
        elHpCur.innerText = valHpCur;
        elHpMax.innerText = valHpMax;
        elHpTemp.innerText = valHpTemp;
        elHdCur.innerText = valHdCur;
        elHdTot.innerText = valHdTot;
    }

    // Iniciativa
    const modDex = calcularModificador(ficha.atributos.destreza);
    const txtInit = modDex >= 0 ? "+" + modDex : modDex;
    document.getElementById('viewInit').innerText = txtInit;

    // Atributos e Perícias
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
            
            const ca = f.armadura || 10;
            const hpAtual = f.vidaAtual !== undefined ? f.vidaAtual : "??";
            const hpMax = f.vidaMaxima || "??";
            
            card.innerHTML = `
                <h3>${f.nome}</h3>
                <p><strong>${f.classe}</strong> (Nv. ${f.nivel})</p>
                <div style="margin-top:10px; border-top:1px solid #eee; padding-top:5px; display:flex; justify-content:space-between;">
                    <span>🛡️ CA: <strong>${ca}</strong></span>
                    <span style="color:#dc3545">❤ HP: <strong>${hpAtual}/${hpMax}</strong></span>
                </div>
            `;
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
        
        const f = parseInt(document.getElementById('input_viewStr').value) || 0;
        const d = parseInt(document.getElementById('input_viewDex').value) || 0;
        const c = parseInt(document.getElementById('input_viewCon').value) || 0;
        const i = parseInt(document.getElementById('input_viewInt').value) || 0;
        const w = parseInt(document.getElementById('input_viewWis').value) || 0;
        const ch = parseInt(document.getElementById('input_viewCha').value) || 0;

        if(f > 99 || d > 99 || c > 99 || i > 99 || w > 99 || ch > 99) {
            alert("⚠️ Nenhum atributo pode ser maior que 99.");
            return;
        }

        btn.innerText = "⏳ ...";

        try {
            const novosAtributos = { forca:f, destreza:d, constituicao:c, inteligencia:i, sabedoria:w, carisma:ch };

            const novaArmadura = document.getElementById('input_armor').value;
            const novoMovimento = document.getElementById('input_speed').value;
            const novoNivel = parseInt(document.getElementById('input_level').value) || 1;
            
            // VIDA E DADOS DE VIDA
            const novaVidaAtual = parseInt(document.getElementById('input_hpCur').value) || 0;
            const novaVidaMax = parseInt(document.getElementById('input_hpMax').value) || 0;
            const novaVidaTemp = parseInt(document.getElementById('input_hpTemp').value) || 0;
            const novoHdCur = parseInt(document.getElementById('input_hdCur').value) || 0;
            const novoHdTot = document.getElementById('input_hdTot').value || "1d8";

            await updateDoc(doc(db, "fichas", idFichaAtual), { 
                atributos: novosAtributos,
                armadura: novaArmadura,
                movimento: novoMovimento,
                nivel: novoNivel,
                vidaAtual: novaVidaAtual,
                vidaMaxima: novaVidaMax,
                vidaTemporaria: novaVidaTemp,
                dadosVidaAtual: novoHdCur,
                dadosVidaTotal: novoHdTot
            });
            
            editando = false;
            btn.innerText = "✏️ Editar";
            btn.style.backgroundColor = "#ffc107";
            btn.style.color = "#333";
            
            carregarFicha(); 
            alert("Ficha atualizada!");
            
        } catch (error) { 
            console.error("Erro ao salvar:", error); 
            alert("Erro ao salvar."); 
            btn.innerText = "💾 Salvar";
        }
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

        if (e && e.type === 'change') {
            await salvarProficiencias(); 
        }
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