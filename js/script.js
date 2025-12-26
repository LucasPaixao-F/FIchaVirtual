// --- 1. BANCO DE DADOS ---
const usuarios = [
    { email: "mestre@rpg.com", senha: "123", cargo: "mestre", temFicha: false },
    { email: "player1@rpg.com", senha: "123", cargo: "player", temFicha: true },
    { email: "player2@rpg.com", senha: "123", cargo: "player", temFicha: true },
    { email: "novato@rpg.com", senha: "123", cargo: "player", temFicha: false }
];

const todasAsFichas = [
    { 
        dono: "player1@rpg.com", nome: "Aragorn", classe: "Guerreiro", raca: "Humano", nivel: 5,
        atributos: { forca: 18, destreza: 14, constituicao: 16, inteligencia: 10, sabedoria: 12, carisma: 15 },
        proficiencias: ["chk_sur", "chk_ath", "chk_saveStr", "chk_saveCon"]
    },
    { 
        dono: "player2@rpg.com", nome: "Legolas", classe: "Arqueiro", raca: "Elfo", nivel: 1, 
        atributos: { forca: 10, destreza: 20, constituicao: 12, inteligencia: 14, sabedoria: 16, carisma: 8 },
        proficiencias: ["chk_acro", "chk_ste", "chk_perc", "chk_saveDex"] 
    }
];

// --- 2. LÓGICA DE LOGIN ---
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', function(event) {
        event.preventDefault();
        const email = document.getElementById('email').value;
        const pass = document.getElementById('password').value;
        const user = usuarios.find(u => u.email === email && u.senha === pass);

        if (!user) { alert("Dados incorretos!"); return; }

        localStorage.setItem('usuarioLogado', JSON.stringify(user));

        if (user.cargo === 'mestre') {
            window.location.href = "pages/painel_mestre.html";
        } else if (user.temFicha) {
            window.location.href = "pages/visualizar_ficha.html";
        } else {
            window.location.href = "pages/criar_ficha.html";
        }
    });
}

// --- 3. LÓGICA: CRIAR FICHA ---
const fichaForm = document.getElementById('fichaForm');
if (fichaForm) {
    fichaForm.addEventListener('submit', function(event) {
        event.preventDefault();
        alert("Ficha criada com sucesso! (Simulação)");
    });
}

// --- 4. LÓGICA: VISUALIZAR FICHA ---
const visualizacao = document.getElementById('visualizarFicha');

if (visualizacao) {
    const userLogado = JSON.parse(localStorage.getItem('usuarioLogado'));
    
    if(!userLogado) {
        console.log("Nenhum usuário logado.");
    } else {
        const minhaFicha = todasAsFichas.find(f => f.dono === userLogado.email);

        if (minhaFicha) {
            document.getElementById('viewName').innerText = minhaFicha.nome;
            document.getElementById('viewClass').innerText = minhaFicha.classe;
            document.getElementById('viewRace').innerText = minhaFicha.raca;

            document.getElementById('viewLevel').innerText = minhaFicha.nivel;
            document.getElementById('viewProf').innerText = calcularProficiencia(minhaFicha.nivel);

            // AGORA PASSAMOS O NOME DO ATRIBUTO PARA O ALERTA FICAR BONITO
            atualizarAtributo('viewStr', 'modStr', minhaFicha.atributos.forca, "Força");
            atualizarAtributo('viewDex', 'modDex', minhaFicha.atributos.destreza, "Destreza");
            atualizarAtributo('viewCon', 'modCon', minhaFicha.atributos.constituicao, "Constituição");
            atualizarAtributo('viewInt', 'modInt', minhaFicha.atributos.inteligencia, "Inteligência");
            atualizarAtributo('viewWis', 'modWis', minhaFicha.atributos.sabedoria, "Sabedoria");
            atualizarAtributo('viewCha', 'modCha', minhaFicha.atributos.carisma, "Carisma");

            atualizarSkills(minhaFicha); 
        }
    }
}

// --- 5. PAINEL DO MESTRE ---
const painelMestre = document.getElementById('listaDeJogadores');
if (painelMestre) {
    painelMestre.innerHTML = '';
    todasAsFichas.forEach(ficha => {
        const card = document.createElement('div');
        card.className = 'player-card';
        card.innerHTML = `
            <h3>${ficha.nome}</h3>
            <p><strong>Classe:</strong> ${ficha.classe} (Nv. ${ficha.nivel})</p>
            <p><strong>Raça:</strong> ${ficha.raca}</p>
            <div style="margin-top:10px;">
                <span class="tag-player">Jog: ${ficha.dono}</span>
            </div>
        `;
        painelMestre.appendChild(card);
    });
}

// --- FUNÇÕES AUXILIARES ---

function calcularModificador(valor) {
    return Math.floor((valor - 10) / 2);
}

function calcularProficiencia(nivel) {
    const prof = Math.floor((nivel - 1) / 4) + 2;
    return "+" + prof;
}

// ATUALIZADA: Agora aceita clique nos atributos principais também!
function atualizarAtributo(idValor, idMod, valorAtributo, nomeAtributo) {
    const valor = parseInt(valorAtributo); 
    const elValorGrande = document.getElementById(idValor);
    const elModPequeno = document.getElementById(idMod);

    // Atualiza números
    elValorGrande.innerText = valor;
    
    const mod = calcularModificador(valor);
    const textoMod = mod >= 0 ? "+" + mod : mod;
    elModPequeno.innerText = `(${textoMod})`;

    // ADICIONA O CLIQUE (ROLAGEM)
    // Se clicar no número grande ou no pequeno, rola o dado
    elValorGrande.style.cursor = "pointer";
    elModPequeno.style.cursor = "pointer";
    elValorGrande.title = "Clique para rolar";

    const funcaoRolar = function() {
        rolarDado(nomeAtributo, mod);
    };

    elValorGrande.onclick = funcaoRolar;
    elModPequeno.onclick = funcaoRolar;
}

function atualizarSkills(ficha) {
    const attr = ficha.atributos;
    const profBonus = parseInt(calcularProficiencia(ficha.nivel));

    if (ficha.proficiencias) {
        ficha.proficiencias.forEach(id => {
            const checkbox = document.getElementById(id);
            if (checkbox) checkbox.checked = true;
        });
    }

    const mods = {
        str: calcularModificador(attr.forca),
        dex: calcularModificador(attr.destreza),
        con: calcularModificador(attr.constituicao),
        int: calcularModificador(attr.inteligencia),
        wis: calcularModificador(attr.sabedoria),
        cha: calcularModificador(attr.carisma)
    };

    configurarLinha("saveStr", "chk_saveStr", mods.str, profBonus);
    configurarLinha("saveDex", "chk_saveDex", mods.dex, profBonus);
    configurarLinha("saveCon", "chk_saveCon", mods.con, profBonus);
    configurarLinha("saveInt", "chk_saveInt", mods.int, profBonus);
    configurarLinha("saveWis", "chk_saveWis", mods.wis, profBonus);
    configurarLinha("saveCha", "chk_saveCha", mods.cha, profBonus);

    configurarLinha("skillAcro", "chk_acro", mods.dex, profBonus);
    configurarLinha("skillAni",  "chk_ani",  mods.wis, profBonus);
    configurarLinha("skillArc",  "chk_arc",  mods.int, profBonus);
    configurarLinha("skillAth",  "chk_ath",  mods.str, profBonus);
    configurarLinha("skillDec",  "chk_dec",  mods.cha, profBonus);
    configurarLinha("skillHis",  "chk_his",  mods.int, profBonus);
    configurarLinha("skillIns",  "chk_ins",  mods.wis, profBonus);
    configurarLinha("skillIntim","chk_intim",mods.cha, profBonus);
    configurarLinha("skillInv",  "chk_inv",  mods.int, profBonus);
    configurarLinha("skillMed",  "chk_med",  mods.wis, profBonus);
    configurarLinha("skillNat",  "chk_nat",  mods.int, profBonus);
    configurarLinha("skillPerc", "chk_perc", mods.wis, profBonus);
    configurarLinha("skillPerf", "chk_perf", mods.cha, profBonus);
    configurarLinha("skillPers", "chk_pers", mods.cha, profBonus);
    configurarLinha("skillRel",  "chk_rel",  mods.int, profBonus);
    configurarLinha("skillSle",  "chk_sle",  mods.dex, profBonus);
    configurarLinha("skillSte",  "chk_ste",  mods.dex, profBonus);
    configurarLinha("skillSur",  "chk_sur",  mods.wis, profBonus);
}

function configurarLinha(idTexto, idCheckbox, modBase, profBonus) {
    const elTexto = document.getElementById(idTexto);
    const elCheck = document.getElementById(idCheckbox);
    
    if (!elTexto) return;

    let nomePericia = "Teste de Perícia";
    // Tenta achar o nome da perícia no HTML (o span anterior)
    if (elTexto.previousElementSibling && elTexto.previousElementSibling.className === "skill-name") {
        nomePericia = elTexto.previousElementSibling.innerText;
    } else if (elTexto.previousElementSibling && elTexto.previousElementSibling.previousElementSibling) {
        // Caso tenha o checkbox no meio
         nomePericia = elTexto.previousElementSibling.previousElementSibling.innerText;
    }

    function calcular() {
        let valorFinal = parseInt(modBase); 
        if (elCheck && elCheck.checked) {
            valorFinal += profBonus; 
        }
        
        const textoFinal = valorFinal >= 0 ? "+" + valorFinal : valorFinal;
        elTexto.innerText = textoFinal;
        elTexto.style.color = (elCheck && elCheck.checked) ? "#0056b3" : "#007bff";

        // CONFIGURA O CLIQUE
        elTexto.onclick = function() {
            rolarDado(nomePericia, valorFinal);
        };
    }

    calcular();
    if (elCheck) elCheck.addEventListener('change', calcular);
}

function rolarDado(nome, modificador) {
    console.log("Tentando rolar:", nome); // Debug no console
    const d20 = Math.floor(Math.random() * 20) + 1;
    const total = d20 + modificador;
    
    let msg = "";
    if (d20 === 20) msg = " 🔥 CRÍTICO!";
    if (d20 === 1) msg = " 💀 FALHA CRÍTICA!";

    alert(`🎲 Rolando ${nome}:\n\nDado: ${d20}\nModificador: ${modificador}\n\nRESULTADO: ${total}${msg}`);
}