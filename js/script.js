// --- 1. BANCO DE DADOS ATUALIZADO ---
const usuarios = [
    { email: "mestre@rpg.com", senha: "123", cargo: "mestre", temFicha: false },
    { email: "player1@rpg.com", senha: "123", cargo: "player", temFicha: true },
    { email: "player2@rpg.com", senha: "123", cargo: "player", temFicha: true },
    { email: "novato@rpg.com", senha: "123", cargo: "player", temFicha: false }
];

const todasAsFichas = [
    { 
        dono: "player1@rpg.com", nome: "Aragorn", classe: "Guerreiro", raca: "Humano", nivel: 5,
        atributos: { forca: 18, destreza: 14, constituicao: 16, inteligencia: 10, sabedoria: 12, carisma: 15 }
    },
    { 
        dono: "player2@rpg.com", nome: "Legolas", classe: "Arqueiro", raca: "Elfo", nivel: 4,
        atributos: { forca: 10, destreza: 20, constituicao: 12, inteligencia: 14, sabedoria: 16, carisma: 8 } 
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

// --- 3. LÓGICA: CRIAR FICHA (Atualizada com novos campos) ---
const fichaForm = document.getElementById('fichaForm');
if (fichaForm) {
    fichaForm.addEventListener('submit', function(event) {
        event.preventDefault();
        
        // Simulação de captura dos novos dados
        const novaFicha = {
            nome: document.getElementById('charName').value,
            // ... outros campos ...
            atributos: {
                forca: document.getElementById('str').value,
                destreza: document.getElementById('dex').value,
                constituicao: document.getElementById('con').value,
                inteligencia: document.getElementById('int').value,
                sabedoria: document.getElementById('wis').value, // NOVO
                carisma: document.getElementById('cha').value   // NOVO
            }
        };

        console.log("Ficha capturada:", novaFicha);
        alert("Ficha criada com sucesso! (Verifique o console para ver os novos atributos)");
    });
}

// --- 4. LÓGICA: VISUALIZAR FICHA ---
const visualizacao = document.getElementById('visualizarFicha');

if (visualizacao) {
    const userLogado = JSON.parse(localStorage.getItem('usuarioLogado'));
    const minhaFicha = todasAsFichas.find(f => f.dono === userLogado.email);

    if (minhaFicha) {
        // Cabeçalho
        document.getElementById('viewName').innerText = minhaFicha.nome;
        document.getElementById('viewClass').innerText = minhaFicha.classe;
        document.getElementById('viewRace').innerText = minhaFicha.raca;
        
        // Função auxiliar para atualizar Valor e Modificador ao mesmo tempo
        atualizarAtributo('viewStr', 'modStr', minhaFicha.atributos.forca);
        atualizarAtributo('viewDex', 'modDex', minhaFicha.atributos.destreza);
        atualizarAtributo('viewCon', 'modCon', minhaFicha.atributos.constituicao);
        atualizarAtributo('viewInt', 'modInt', minhaFicha.atributos.inteligencia);
        atualizarAtributo('viewWis', 'modWis', minhaFicha.atributos.sabedoria);
        atualizarAtributo('viewCha', 'modCha', minhaFicha.atributos.carisma);
    }
}

// --- FUNÇÕES AUXILIARES ---

// 1. Calcula o modificador: (Valor - 10) / 2
function calcularModificador(valor) {
    const mod = Math.floor((valor - 10) / 2);
    // Se for positivo, coloca um "+" na frente. Se for negativo, o JS já põe o "-" sozinho.
    return mod >= 0 ? "+" + mod : mod;
}

// 2. Preenche o HTML do Valor Grande e do Modificador Pequeno
function atualizarAtributo(idValor, idMod, valorAtributo) {
    // Converte para número caso venha como texto do input
    const valor = parseInt(valorAtributo); 
    
    // Atualiza o número grande
    document.getElementById(idValor).innerText = valor;
    
    // Atualiza o modificador pequeno (ex: +3)
    document.getElementById(idMod).innerText = `(${calcularModificador(valor)})`;
}


// --- 5. LÓGICA: PAINEL DO MESTRE ---
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