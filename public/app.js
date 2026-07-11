const SUPABASE_URL = 'https://thjjdwsohwtcxudmdsxx.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_PFTq8owsFjMDzhZsHXnuig_PWg-btYL';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function authToken(){
  try {
    const { data } = await supabaseClient.auth.getSession();
    return (data && data.session) ? data.session.access_token : null;
  } catch { return null; }
}

async function ensurePlayerRow(authUser){
  const { data: existing } = await supabaseClient.from('players').select('*').eq('auth_user_id', authUser.id).maybeSingle();
  if (existing) return existing;
  let pending = null;
  try { pending = JSON.parse(localStorage.getItem('g6_pending_profile') || 'null'); } catch {}
  const username = (pending && pending.username) || ('Joueur' + Math.floor(Math.random()*100000));
  const region = (pending && pending.region) || 'EU-West';
  const { data: created, error } = await supabaseClient.from('players').insert({ auth_user_id: authUser.id, username, region }).select('*').single();
  localStorage.removeItem('g6_pending_profile');
  if (error) throw error;
  return created;
}

function playerToUser(p){
  return { id: p.id, pseudo: p.username, score: p.hustle_score || 0, bestTime: p.best_quiz_time || null, quizzesTaken: p.quizzes_taken || 0, country: p.region || '??' };
}

let __chatRealtimeStarted = false;
function startChatRealtime(){
  if (__chatRealtimeStarted) return;
  __chatRealtimeStarted = true;
  supabaseClient.channel('public:chat_messages')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (payload) => {
      const m = payload.new;
      if ((m.room || 'global') !== 'global') return;
      state.chatMessages.push({ pseudo: m.username, country: m.country, text: m.content });
      state.chatMessages = state.chatMessages.slice(-200);
      if (state.tab === 'chat') render();
    })
    .subscribe();
}

async function restoreSupabaseSession(){
  try {
    const { data } = await supabaseClient.auth.getSession();
    if (data && data.session) {
      const player = await ensurePlayerRow(data.session.user);
      state.user = playerToUser(player);
      render();
    }
  } catch (e) {}
  supabaseClient.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_OUT') { state.user = null; render(); return; }
    if (session && session.user && !state.user) {
      try {
        const player = await ensurePlayerRow(session.user);
        state.user = playerToUser(player);
        render();
      } catch (e) {}
    }
  });
}
/* ============ I18N ============ */
const I18N = {
  fr: {
    tag: "Application non-officielle de fans", ageGateTitle: "Vérification d’âge", ageGateText: "GTA 6 est classé PEGI 18 / ESRB Mature (violence, langage grossier, thèmes sexuels, usage de drogue). Vous devez avoir 18 ans ou plus pour accéder à ce site.", ageGateConfirm: "J’ai 18 ans ou plus", ageGateLeave: "Quitter", maturityBadge: "Contenu pour adultes — PEGI 18 / ESRB Mature", shareFallbackMsg: "Lien de partage ouvert dans un nouvel onglet", reportBtn: "Signaler", reportSent: "Signalement envoyé, merci.",
    heroTitle1: "LA COMMUNAUTÉ", heroTitleAccent: "GTA 6",
    heroDesc: "Classement mondial, chat en direct, quiz, galerie de tenues & véhicules, et un assistant IA dédié. Le point de ralliement des fans avant le 19 novembre 2026.",
    statMembers: "Membres", statMsgs: "Messages échangés", statDays: "Jours avant la sortie", statHours: "Heures", statMinutes: "Minutes", statSeconds: "Secondes",
    navHome: "Accueil", navRank: "Classement", navChat: "Chat", navQuiz: "Quiz", navGallery: "Galerie", navAI: "Assistant IA", navMap: "Lieux",
    loginBtn: "Se connecter", createAccount: "Créer un compte",
    infoTitle: "Le point sur GTA 6", infoSub: "Infos officielles confirmées par Rockstar / Take-Two",
    rankTitle: "Classement mondial", rankSub: "Gagne des points en répondant aux quiz",
    chatTitle: "Chat communautaire", chatSub: "Discute en direct avec les fans du monde entier",
    chatPlaceholder: "Écris ton message...", chatSend: "Envoyer",
    quizTitle: "Quiz GTA 6", quizSub: "Teste tes connaissances et grimpe au classement",
    quizStart: "Démarrer le quiz", quizNext: "Question suivante", quizFinish: "Voir mon score",
    quizResultTitle: "Résultat", quizScoreOf: "sur",
    galleryTitle: "Galerie communautaire", gallerySub: "Montre ta tenue ou ton véhicule",
    galleryAdd: "Publier", galleryImgUrl: "Lien de l'image (URL)", galleryCategory: "Catégorie", galleryCaption: "Légende (optionnel)", mapTitle: "Lieux de Leonida", mapSub: "Les régions confirmées officiellement par Rockstar Games", showcaseTitle: "Véhicules, armes & tenues", showcaseSub: "Aperçu officiel de l'Édition Ultime",
    catTenue: "Tenue", catVehicule: "Véhicule",
    aiTitle: "Assistant IA — Ray", aiSub: "Pose tes questions sur GTA 6 (infos officielles et discussion générale)",
    aiPlaceholder: "Demande à Ray...", aiWelcome: "Salut ! Je suis Ray 🤙 Pose-moi une question sur GTA 6 : le setting, les persos, les dates, les mécaniques probables...",
    loginPseudo: "Pseudo", loginPin: "Code PIN (4 à 6 chiffres)", loginCountry: "Pays (optionnel, ex: FR)",
    loginSubmit: "Se connecter", registerSubmit: "Créer mon compte",
    logout: "Déconnexion", needAccount: "Connecte-toi pour participer",
    footerText: "Application communautaire non-officielle. Non affiliée à Rockstar Games ni à Take-Two Interactive.",
    close: "Fermer", loading: "Chargement...", empty: "Rien à afficher pour le moment.",
    typing: "Ray réfléchit...",
    scoreEarned: "points gagnés", correct: "Bonne réponse !", incorrect: "Mauvaise réponse.", teaserTitle: "Bande-annonce officielle", teaserSub: "Trailer publie par Rockstar Games sur YouTube", quizTimeLeft: "Temps restant", quizBestTime: "Meilleur temps", quizYourTime: "Ton temps", quizNewRecord: "Nouveau record !", preorderTitle: "Précommande officielle", preorderSub: "Précommandez GTA 6 directement sur le site officiel de Rockstar Games.",  preorderBtn: "Précommander sur Rockstar Games", trailer2Label: "Bande-annonce 2", charactersTitle: "Personnages", charactersSub: "Les deux protagonistes confirmés de GTA 6", charJasonName: "Jason Duval", charJasonBio: "Ancien petit délinquant originaire de Leonida, entraîné par amour et appât du gain dans une vie de braquages aux côtés de Lucia.", charLuciaName: "Lucia Caminos", charLuciaBio: "Tout juste sortie de prison, Lucia veut une vie meilleure pour elle et sa famille. Avec Jason, elle forme l'un des deux protagonistes jouables de GTA 6, dans l'esprit de Bonnie and Clyde.", newsTitle: "Actu officielle Rockstar", shareScoreBtn: "Partager mon score", newsSub: "Les dernières annonces confirmées par Rockstar Games", newsItems: [{d:"19 nov. 2026", t:"Sortie mondiale sur PS5 et Xbox Series X|S."},{d:"25 juin 2026", t:"Ouverture des précommandes sur les stores officiels."},{d:"6 nov. 2025", t:"La date de sortie est repoussée au 19 novembre 2026."},{d:"6 mai 2025", t:"Rockstar dévoile le Trailer 2 de GTA 6."},{d:"5 déc. 2023", t:"Rockstar annonce officiellement GTA 6 avec le Trailer 1."}], newsTitle: "Actu officielle Rockstar", newsSub: "Les dernières annonces confirmées par Rockstar Games", newsItems: [{d:"19 nov. 2026", t:"Sortie mondiale sur PS5 et Xbox Series X|S."},{d:"25 juin 2026", t:"Ouverture des précommandes sur les stores officiels."},{d:"6 nov. 2025", t:"La date de sortie est repoussée au 19 novembre 2026."},{d:"6 mai 2025", t:"Rockstar dévoile le Trailer 2 de GTA 6."},{d:"5 déc. 2023", t:"Rockstar annonce officiellement GTA 6 avec le Trailer 1."}],
    facts: [
      {q:"Date de sortie", a:"19 novembre 2026, sur PS5 et Xbox Series X|S."},
      {q:"Studio", a:"Développé par Rockstar Games, édité par Take-Two Interactive."},
      {q:"Lieu", a:"L'État fictif de Leonida (inspiré de la Floride), avec Vice City comme ville principale."},
      {q:"Protagonistes", a:"Lucia Caminos et Jason Duval, un duo à la Bonnie & Clyde."},
      {q:"Prix", a:"79,99$ (édition standard) / 99,99$ (édition Ultimate)."}
    ]
  },
en: {
    tag: "Unofficial fan-made application", ageGateTitle: "Age Verification", ageGateText: "GTA 6 is rated PEGI 18 / ESRB Mature (violence, strong language, sexual themes, drug use). You must be 18 or older to access this site.", ageGateConfirm: "I am 18 or older", ageGateLeave: "Leave", maturityBadge: "Adult content — PEGI 18 / ESRB Mature", shareFallbackMsg: "Share link opened in a new tab", reportBtn: "Report", reportSent: "Report sent, thank you.",
    heroTitle1: "THE GTA 6", heroTitleAccent: "COMMUNITY",
    heroDesc: "Global leaderboard, live chat, quizzes, outfit & vehicle gallery, and a dedicated AI assistant. The gathering point for fans before November 19, 2026.",
    statMembers: "Members", statMsgs: "Messages sent", statDays: "Days until release", statHours: "Hours", statMinutes: "Minutes", statSeconds: "Seconds",
    navHome: "Home", navRank: "Leaderboard", navChat: "Chat", navQuiz: "Quiz", navGallery: "Gallery", navAI: "AI Assistant", navMap: "Locations",
    loginBtn: "Log in", createAccount: "Create account",
    infoTitle: "GTA 6 rundown", infoSub: "Officially confirmed by Rockstar / Take-Two",
    rankTitle: "Global leaderboard", rankSub: "Earn points by answering quizzes",
    chatTitle: "Community chat", chatSub: "Chat live with fans from around the world",
    chatPlaceholder: "Type your message...", chatSend: "Send",
    quizTitle: "GTA 6 Quiz", quizSub: "Test your knowledge and climb the leaderboard",
    quizStart: "Start quiz", quizNext: "Next question", quizFinish: "See my score",
    quizResultTitle: "Result", quizScoreOf: "out of",
    galleryTitle: "Community gallery", gallerySub: "Show off your outfit or vehicle",
    galleryAdd: "Post", galleryImgUrl: "Image link (URL)", galleryCategory: "Category", galleryCaption: "Caption (optional)", mapTitle: "Locations of Leonida", mapSub: "Regions officially confirmed by Rockstar Games", showcaseTitle: "Vehicles, weapons & outfits", showcaseSub: "Official Ultimate Edition preview",
    catTenue: "Outfit", catVehicule: "Vehicle",
    aiTitle: "AI Assistant — Ray", aiSub: "Ask anything about GTA 6 (official info & general discussion)",
    aiPlaceholder: "Ask Ray...", aiWelcome: "Hey! I'm Ray 🤙 Ask me anything about GTA 6: setting, characters, dates, likely mechanics...",
    loginPseudo: "Username", loginPin: "PIN code (4 to 6 digits)", loginCountry: "Country (optional, e.g. US)",
    loginSubmit: "Log in", registerSubmit: "Create account",
    logout: "Log out", needAccount: "Log in to take part",
    footerText: "Unofficial fan community app. Not affiliated with Rockstar Games or Take-Two Interactive.",
    close: "Close", loading: "Loading...", empty: "Nothing to show yet.",
    typing: "Ray is thinking...",
    scoreEarned: "points earned", correct: "Correct!", incorrect: "Wrong answer.", teaserTitle: "Official trailer", teaserSub: "Trailer published by Rockstar Games on YouTube", quizTimeLeft: "Time left", quizBestTime: "Best time", quizYourTime: "Your time", quizNewRecord: "New record!", preorderTitle: "Official Pre-order", preorderSub: "Pre-order GTA 6 directly on the official Rockstar Games website.", preorderBtn: "Pre-order on Rockstar Games", trailer2Label: "Trailer 2", charactersTitle: "Characters", charactersSub: "The two confirmed protagonists of GTA 6", charJasonName: "Jason Duval", charJasonBio: "A small-time criminal from Leonida, pulled into a life of robbery alongside Lucia by love and the promise of easy money.", charLuciaName: "Lucia Caminos", charLuciaBio: "Fresh out of prison, Lucia wants a better life for herself and her family. Alongside Jason, she is one of the two playable protagonists in GTA 6, in the spirit of Bonnie and Clyde.", newsTitle: "Official Rockstar News", shareScoreBtn: "Share my score", newsSub: "The latest confirmed announcements from Rockstar Games", newsItems: [{d:"Nov 19, 2026", t:"Worldwide release on PS5 and Xbox Series X|S."},{d:"Jun 25, 2026", t:"Pre-orders open on official storefronts."},{d:"Nov 6, 2025", t:"Release date pushed back to November 19, 2026."},{d:"May 6, 2025", t:"Rockstar unveils GTA 6 Trailer 2."},{d:"Dec 5, 2023", t:"Rockstar officially announces GTA 6 with Trailer 1."}],
    facts: [
      {q:"Release date", a:"November 19, 2026, on PS5 and Xbox Series X|S."},
      {q:"Studio", a:"Developed by Rockstar Games, published by Take-Two Interactive."},
      {q:"Setting", a:"The fictional state of Leonida (Florida-inspired), with Vice City as the main city."},
      {q:"Protagonists", a:"Lucia Caminos and Jason Duval, a Bonnie & Clyde-style duo."},
      {q:"Price", a:"$79.99 (Standard Edition) / $99.99 (Ultimate Edition)."}
    ]
  },
    es: {
    tag: "Aplicación no oficial de fans",
    heroTitle1: "LA COMUNIDAD", heroTitleAccent: "GTA 6",
    heroDesc: "Clasificación mundial, chat en vivo, quiz, galería de outfits y vehículos, y un asistente de IA dedicado. El punto de encuentro de los fans antes del 19 de noviembre de 2026.",
    statMembers: "Miembros", statMsgs: "Mensajes enviados", statDays: "Días para el lanzamiento", statHours: "Horas", statMinutes: "Minutos", statSeconds: "Segundos",
    navHome: "Inicio", navRank: "Clasificación", navChat: "Chat", navQuiz: "Quiz", navGallery: "Galería", navAI: "Asistente IA", navMap: "Lugares",
    loginBtn: "Iniciar sesión", createAccount: "Crear cuenta",
    infoTitle: "Lo esencial de GTA 6", infoSub: "Información oficial confirmada por Rockstar / Take-Two",
    rankTitle: "Clasificación mundial", rankSub: "Gana puntos respondiendo los quiz",
    chatTitle: "Chat comunitario", chatSub: "Chatea en vivo con fans de todo el mundo",
    chatPlaceholder: "Escribe tu mensaje...", chatSend: "Enviar",
    quizTitle: "Quiz de GTA 6", quizSub: "Pon a prueba tus conocimientos y sube en la clasificación",
    quizStart: "Empezar el quiz", quizNext: "Siguiente pregunta", quizFinish: "Ver mi puntuación",
    quizResultTitle: "Resultado", quizScoreOf: "de",
    galleryTitle: "Galería comunitaria", gallerySub: "Muestra tu outfit o tu vehículo",
    galleryAdd: "Publicar", galleryImgUrl: "Enlace de la imagen (URL)", galleryCategory: "Categoría", galleryCaption: "Descripción (opcional)", mapTitle: "Lugares de Leonida", mapSub: "Las regiones confirmadas oficialmente por Rockstar Games", showcaseTitle: "Vehículos, armas y outfits", showcaseSub: "Vista previa oficial de la Edición Ultimate",
    catTenue: "Outfit", catVehicule: "Vehículo",
    aiTitle: "Asistente IA — Ray", aiSub: "Haz tus preguntas sobre GTA 6 (información oficial y charla general)",
    aiPlaceholder: "Pregunta a Ray...", aiWelcome: "¡Hola! Soy Ray 🤙 Pregúntame lo que quieras sobre GTA 6: el escenario, los personajes, las fechas, las mecánicas probables...",
    loginPseudo: "Apodo", loginPin: "Código PIN (4 a 6 dígitos)", loginCountry: "País (opcional, ej: ES)",
    loginSubmit: "Iniciar sesión", registerSubmit: "Crear mi cuenta",
    logout: "Cerrar sesión", needAccount: "Inicia sesión para participar",
    footerText: "Aplicación comunitaria no oficial. No afiliada a Rockstar Games ni a Take-Two Interactive.",
    close: "Cerrar", loading: "Cargando...", empty: "Nada que mostrar por ahora.",
    typing: "Ray está pensando...",
    scoreEarned: "puntos ganados", correct: "¡Respuesta correcta!", incorrect: "Respuesta incorrecta.", teaserTitle: "Tráiler oficial", teaserSub: "Tráiler publicado por Rockstar Games en YouTube", quizTimeLeft: "Tiempo restante", quizBestTime: "Mejor tiempo", quizYourTime: "Tu tiempo", quizNewRecord: "¡Nuevo récord!",
    facts: [
      {q:"Fecha de lanzamiento", a:"19 de noviembre de 2026, en PS5 y Xbox Series X|S."},
      {q:"Estudio", a:"Desarrollado por Rockstar Games, publicado por Take-Two Interactive."},
      {q:"Ambientación", a:"El estado ficticio de Leonida (inspirado en Florida), con Vice City como ciudad principal."},
      {q:"Protagonistas", a:"Lucia Caminos y Jason Duval, un dúo al estilo Bonnie & Clyde."},
      {q:"Precio", a:"79,99 $ (edición estándar) / 99,99 $ (edición Ultimate)."}
    ]
  },
  pt: {
    tag: "Aplicativo não oficial de fãs",
    heroTitle1: "A COMUNIDADE", heroTitleAccent: "GTA 6",
    heroDesc: "Ranking mundial, chat em tempo real, quiz, galeria de roupas e veículos, e um assistente de IA dedicado. O ponto de encontro dos fãs antes de 19 de novembro de 2026.",
    statMembers: "Membros", statMsgs: "Mensagens enviadas", statDays: "Dias até o lançamento", statHours: "Horas", statMinutes: "Minutos", statSeconds: "Segundos",
    navHome: "Início", navRank: "Ranking", navChat: "Chat", navQuiz: "Quiz", navGallery: "Galeria", navAI: "Assistente IA", navMap: "Locais",
    loginBtn: "Entrar", createAccount: "Criar conta",
    infoTitle: "Tudo sobre o GTA 6", infoSub: "Informações oficiais confirmadas pela Rockstar / Take-Two",
    rankTitle: "Ranking mundial", rankSub: "Ganhe pontos respondendo aos quizzes",
    chatTitle: "Chat da comunidade", chatSub: "Converse em tempo real com fãs do mundo todo",
    chatPlaceholder: "Digite sua mensagem...", chatSend: "Enviar",
    quizTitle: "Quiz de GTA 6", quizSub: "Teste seus conhecimentos e suba no ranking",
    quizStart: "Iniciar quiz", quizNext: "Próxima pergunta", quizFinish: "Ver minha pontuação",
    quizResultTitle: "Resultado", quizScoreOf: "de",
    galleryTitle: "Galeria da comunidade", gallerySub: "Mostre sua roupa ou seu veículo",
    galleryAdd: "Publicar", galleryImgUrl: "Link da imagem (URL)", galleryCategory: "Categoria", galleryCaption: "Legenda (opcional)", mapTitle: "Locais de Leonida", mapSub: "As regiões oficialmente confirmadas pela Rockstar Games", showcaseTitle: "Veículos, armas e roupas", showcaseSub: "Prévia oficial da Edição Ultimate",
    catTenue: "Roupa", catVehicule: "Veículo",
    aiTitle: "Assistente IA — Ray", aiSub: "Faça suas perguntas sobre GTA 6 (informações oficiais e conversa geral)",
    aiPlaceholder: "Pergunte ao Ray...", aiWelcome: "Olá! Eu sou o Ray 🤙 Pergunte-me qualquer coisa sobre GTA 6: cenário, personagens, datas, mecânicas prováveis...",
    loginPseudo: "Apelido", loginPin: "Código PIN (4 a 6 dígitos)", loginCountry: "País (opcional, ex: BR)",
    loginSubmit: "Entrar", registerSubmit: "Criar minha conta",
    logout: "Sair", needAccount: "Entre para participar",
    footerText: "Aplicativo comunitário não oficial. Não afiliado à Rockstar Games ou à Take-Two Interactive.",
    close: "Fechar", loading: "Carregando...", empty: "Nada para mostrar por agora.",
    typing: "Ray está pensando...",
    scoreEarned: "pontos ganhos", correct: "Resposta correta!", incorrect: "Resposta incorreta.", teaserTitle: "Trailer oficial", teaserSub: "Trailer publicado pela Rockstar Games no YouTube", quizTimeLeft: "Tempo restante", quizBestTime: "Melhor tempo", quizYourTime: "Seu tempo", quizNewRecord: "Novo record!",
    facts: [
      {q:"Data de lançamento", a:"19 de novembro de 2026, em PS5 e Xbox Series X|S."},
      {q:"Estúdio", a:"Desenvolvido pela Rockstar Games, publicado pela Take-Two Interactive."},
      {q:"Cenário", a:"O estado fictício de Leonida (inspirado na Flórida), com Vice City como cidade principal."},
      {q:"Protagonistas", a:"Lucia Caminos e Jason Duval, uma dupla ao estilo Bonnie & Clyde."},
      {q:"Preço", a:"US$ 79,99 (edição padrão) / US$ 99,99 (edição Ultimate)."}
    ]
  },
  de: {
    tag: "Nicht offizielle Fan-Anwendung",
    heroTitle1: "DIE GTA 6", heroTitleAccent: "COMMUNITY",
    heroDesc: "Weltweite Bestenliste, Live-Chat, Quiz, Outfit- und Fahrzeuggalerie und ein eigener KI-Assistent. Der Treffpunkt für Fans vor dem 19. November 2026.",
    statMembers: "Mitglieder", statMsgs: "Gesendete Nachrichten", statDays: "Tage bis zur Veröffentlichung", statHours: "Stunden", statMinutes: "Minuten", statSeconds: "Sekunden",
    navHome: "Start", navRank: "Bestenliste", navChat: "Chat", navQuiz: "Quiz", navGallery: "Galerie", navAI: "KI-Assistent", navMap: "Orte",
    loginBtn: "Anmelden", createAccount: "Konto erstellen",
    infoTitle: "GTA 6 im Überblick", infoSub: "Offiziell bestätigt von Rockstar / Take-Two",
    rankTitle: "Weltweite Bestenliste", rankSub: "Sammle Punkte, indem du Quizfragen beantwortest",
    chatTitle: "Community-Chat", chatSub: "Chatte live mit Fans aus aller Welt",
    chatPlaceholder: "Schreib deine Nachricht...", chatSend: "Senden",
    quizTitle: "GTA 6 Quiz", quizSub: "Teste dein Wissen und klettere in der Bestenliste",
    quizStart: "Quiz starten", quizNext: "Nächste Frage", quizFinish: "Mein Ergebnis ansehen",
    quizResultTitle: "Ergebnis", quizScoreOf: "von",
    galleryTitle: "Community-Galerie", gallerySub: "Zeig dein Outfit oder Fahrzeug",
    galleryAdd: "Veröffentlichen", galleryImgUrl: "Bildlink (URL)", galleryCategory: "Kategorie", galleryCaption: "Beschriftung (optional)", mapTitle: "Orte von Leonida", mapSub: "Die offiziell von Rockstar Games bestätigten Regionen", showcaseTitle: "Fahrzeuge, Waffen & Outfits", showcaseSub: "Offizielle Vorschau der Ultimate Edition",
    catTenue: "Outfit", catVehicule: "Fahrzeug",
    aiTitle: "KI-Assistent — Ray", aiSub: "Stell deine Fragen zu GTA 6 (offizielle Infos und allgemeine Diskussion)",
    aiPlaceholder: "Frag Ray...", aiWelcome: "Hey! Ich bin Ray 🤙 Frag mich alles über GTA 6: Setting, Charaktere, Termine, wahrscheinliche Mechaniken...",
    loginPseudo: "Benutzername", loginPin: "PIN-Code (4 bis 6 Ziffern)", loginCountry: "Land (optional, z. B. DE)",
    loginSubmit: "Anmelden", registerSubmit: "Konto erstellen",
    logout: "Abmelden", needAccount: "Melde dich an, um teilzunehmen",
    footerText: "Inoffizielle Fan-Community-App. Nicht verbunden mit Rockstar Games oder Take-Two Interactive.",
    close: "Schließen", loading: "Lädt...", empty: "Momentan nichts anzuzeigen.",
    typing: "Ray denkt nach...",
    scoreEarned: "Punkte erhalten", correct: "Richtige Antwort!", incorrect: "Falsche Antwort.", teaserTitle: "Offizieller Trailer", teaserSub: "Trailer veröffentlicht von Rockstar Games auf YouTube", quizTimeLeft: "Verbleibende Zeit", quizBestTime: "Beste Zeit", quizYourTime: "Deine Zeit", quizNewRecord: "Neuer Rekord!",
    facts: [
      {q:"Erscheinungsdatum", a:"19. November 2026, für PS5 und Xbox Series X|S."},
      {q:"Studio", a:"Entwickelt von Rockstar Games, veröffentlicht von Take-Two Interactive."},
      {q:"Setting", a:"Der fiktive Bundesstaat Leonida (inspiriert von Florida), mit Vice City als Hauptstadt."},
      {q:"Protagonisten", a:"Lucia Caminos und Jason Duval, ein Duo im Bonnie-&-Clyde-Stil."},
      {q:"Preis", a:"79,99 $ (Standard Edition) / 99,99 $ (Ultimate Edition)."}
    ]
  },
  it: {
    tag: "Applicazione non ufficiale di fan",
    heroTitle1: "LA COMMUNITY", heroTitleAccent: "GTA 6",
    heroDesc: "Classifica mondiale, chat dal vivo, quiz, galleria di abiti e veicoli, e un assistente IA dedicato. Il punto di ritrovo dei fan prima del 19 novembre 2026.",
    statMembers: "Membri", statMsgs: "Messaggi inviati", statDays: "Giorni all'uscita", statHours: "Ore", statMinutes: "Minuti", statSeconds: "Secondi",
    navHome: "Home", navRank: "Classifica", navChat: "Chat", navQuiz: "Quiz", navGallery: "Galleria", navAI: "Assistente IA", navMap: "Luoghi",
    loginBtn: "Accedi", createAccount: "Crea account",
    infoTitle: "Tutto su GTA 6", infoSub: "Informazioni ufficiali confermate da Rockstar / Take-Two",
    rankTitle: "Classifica mondiale", rankSub: "Guadagna punti rispondendo ai quiz",
    chatTitle: "Chat della community", chatSub: "Chatta dal vivo con fan da tutto il mondo",
    chatPlaceholder: "Scrivi il tuo messaggio...", chatSend: "Invia",
    quizTitle: "Quiz di GTA 6", quizSub: "Metti alla prova le tue conoscenze e scala la classifica",
    quizStart: "Inizia il quiz", quizNext: "Prossima domanda", quizFinish: "Vedi il mio punteggio",
    quizResultTitle: "Risultato", quizScoreOf: "su",
    galleryTitle: "Galleria della community", gallerySub: "Mostra il tuo outfit o il tuo veicolo",
    galleryAdd: "Pubblica", galleryImgUrl: "Link dell'immagine (URL)", galleryCategory: "Categoria", galleryCaption: "Descrizione (opzionale)", mapTitle: "Luoghi di Leonida", mapSub: "Le regioni confermate ufficialmente da Rockstar Games", showcaseTitle: "Veicoli, armi e abiti", showcaseSub: "Anteprima ufficiale dell'Edizione Ultimate",
    catTenue: "Abito", catVehicule: "Veicolo",
    aiTitle: "Assistente IA — Ray", aiSub: "Fai le tue domande su GTA 6 (informazioni ufficiali e discussione generale)",
    aiPlaceholder: "Chiedi a Ray...", aiWelcome: "Ciao! Sono Ray 🤙 Chiedimi qualsiasi cosa su GTA 6: ambientazione, personaggi, date, meccaniche probabili...",
    loginPseudo: "Nome utente", loginPin: "Codice PIN (da 4 a 6 cifre)", loginCountry: "Paese (opzionale, es: IT)",
    loginSubmit: "Accedi", registerSubmit: "Crea il mio account",
    logout: "Esci", needAccount: "Accedi per partecipare",
    footerText: "App comunitaria non ufficiale. Non affiliata a Rockstar Games o Take-Two Interactive.",
    close: "Chiudi", loading: "Caricamento...", empty: "Niente da mostrare per ora.",
    typing: "Ray sta pensando...",
    scoreEarned: "punti guadagnati", correct: "Risposta corretta!", incorrect: "Risposta sbagliata.", teaserTitle: "Trailer ufficiale", teaserSub: "Trailer pubblicato da Rockstar Games su YouTube", quizTimeLeft: "Tempo rimasto", quizBestTime: "Miglior tempo", quizYourTime: "Il tuo tempo", quizNewRecord: "Nuovo record!",
    facts: [
      {q:"Data di uscita", a:"19 novembre 2026, su PS5 e Xbox Series X|S."},
      {q:"Studio", a:"Sviluppato da Rockstar Games, pubblicato da Take-Two Interactive."},
      {q:"Ambientazione", a:"Lo stato immaginario di Leonida (ispirato alla Florida), con Vice City come città principale."},
      {q:"Protagonisti", a:"Lucia Caminos e Jason Duval, un duo in stile Bonnie & Clyde."},
      {q:"Prezzo", a:"79,99 $ (edizione standard) / 99,99 $ (edizione Ultimate)."}
    ]
  },
  ru: {
    tag: "Неофициальное фан-приложение",
    heroTitle1: "СООБЩЕСТВО", heroTitleAccent: "GTA 6",
    heroDesc: "Мировой рейтинг, живой чат, викторины, галерея одежды и транспорта, и специальный ИИ-помощник. Место встречи фанатов до 19 ноября 2026 года.",
    statMembers: "Участники", statMsgs: "Отправлено сообщений", statDays: "Дней до релиза", statHours: "Часы", statMinutes: "Минуты", statSeconds: "Секунды",
    navHome: "Главная", navRank: "Рейтинг", navChat: "Чат", navQuiz: "Викторина", navGallery: "Галерея", navAI: "ИИ-помощник", navMap: "Локации",
    loginBtn: "Войти", createAccount: "Создать аккаунт",
    infoTitle: "Всё о GTA 6", infoSub: "Официально подтверждено Rockstar / Take-Two",
    rankTitle: "Мировой рейтинг", rankSub: "Зарабатывай очки, отвечая на вопросы викторины",
    chatTitle: "Чат сообщества", chatSub: "Общайся в реальном времени с фанатами со всего мира",
    chatPlaceholder: "Введите сообщение...", chatSend: "Отправить",
    quizTitle: "Викторина GTA 6", quizSub: "Проверь свои знания и поднимись в рейтинге",
    quizStart: "Начать викторину", quizNext: "Следующий вопрос", quizFinish: "Посмотреть результат",
    quizResultTitle: "Результат", quizScoreOf: "из",
    galleryTitle: "Галерея сообщества", gallerySub: "Покажи свою одежду или транспорт",
    galleryAdd: "Опубликовать", galleryImgUrl: "Ссылка на изображение (URL)", galleryCategory: "Категория", galleryCaption: "Подпись (необязательно)", mapTitle: "Локации Леониды", mapSub: "Регионы, официально подтвержденные Rockstar Games", showcaseTitle: "Транспорт, оружие и одежда", showcaseSub: "Официальный превью Ultimate Edition",
    catTenue: "Одежда", catVehicule: "Транспорт",
    aiTitle: "ИИ-помощник — Рэй", aiSub: "Задавай вопросы о GTA 6 (официальная информация и общение)",
    aiPlaceholder: "Спроси Рэя...", aiWelcome: "Привет! Я Рэй 🤙 Спрашивай меня о чём угодно про GTA 6: сеттинг, персонажи, даты, вероятные механики...",
    loginPseudo: "Имя пользователя", loginPin: "PIN-код (от 4 до 6 цифр)", loginCountry: "Страна (необязательно, напр. RU)",
    loginSubmit: "Войти", registerSubmit: "Создать аккаунт",
    logout: "Выйти", needAccount: "Войдите, чтобы участвовать",
    footerText: "Неофициальное фан-приложение сообщества. Не связано с Rockstar Games или Take-Two Interactive.",
    close: "Закрыть", loading: "Загрузка...", empty: "Пока нечего показать.",
    typing: "Рэй думает...",
    scoreEarned: "очков получено", correct: "Правильный ответ!", incorrect: "Неправильный ответ.", teaserTitle: "Официальный трейлер", teaserSub: "Трейлер опубликован Rockstar Games на YouTube", quizTimeLeft: "Осталось времени", quizBestTime: "Лучшее время", quizYourTime: "Ваше время", quizNewRecord: "Новый рекорд!",
    facts: [
      {q:"Дата выхода", a:"19 ноября 2026 года, на PS5 и Xbox Series X|S."},
      {q:"Студия", a:"Разработано Rockstar Games, издано Take-Two Interactive."},
      {q:"Место действия", a:"Вымышленный штат Леонида (по мотивам Флориды), главный город — Vice City."},
      {q:"Главные герои", a:"Люсия Каминос и Джейсон Дюваль, дуэт в стиле Бонни и Клайда."},
      {q:"Цена", a:"79,99 $ (стандартное издание) / 99,99 $ (издание Ultimate)."}
    ]
  },
  ar: {
    tag: "تطبيق غير رسمي للمعجبين",
    heroTitle1: "مجتمع", heroTitleAccent: "GTA 6",
    heroDesc: "تصنيف عالمي، دردشة مباشرة، اختبارات، معرض للأزياء والمركبات، ومساعد ذكاء اصطناعي مخصص. نقطة تجمع المعجبين قبل 19 نوفمبر 2026.",
    statMembers: "الأعضاء", statMsgs: "الرسائل المرسلة", statDays: "الأيام المتبقية للإصدار", statHours: "ساعات", statMinutes: "دقائق", statSeconds: "ثوانٍ",
    navHome: "الرئيسية", navRank: "الترتيب", navChat: "الدردشة", navQuiz: "الاختبار", navGallery: "المعرض", navAI: "المساعد الذكي", navMap: "الأماكن",
    loginBtn: "تسجيل الدخول", createAccount: "إنشاء حساب",
    infoTitle: "كل ما يخص GTA 6", infoSub: "معلومات رسمية مؤكدة من Rockstar / Take-Two",
    rankTitle: "الترتيب العالمي", rankSub: "اكسب نقاطًا بالإجابة على الاختبارات",
    chatTitle: "دردشة المجتمع", chatSub: "تحدث مباشرة مع المعجبين من كل العالم",
    chatPlaceholder: "اكتب رسالتك...", chatSend: "إرسال",
    quizTitle: "اختبار GTA 6", quizSub: "اختبر معرفتك وتصاعد في الترتيب",
    quizStart: "ابدأ الاختبار", quizNext: "السؤال التالي", quizFinish: "شاهد نتيجتي",
    quizResultTitle: "النتيجة", quizScoreOf: "من",
    galleryTitle: "معرض المجتمع", gallerySub: "أظهر ملابسك أو مركبتك",
    galleryAdd: "نشر", galleryImgUrl: "رابط الصورة (URL)", galleryCategory: "الفئة", galleryCaption: "وصف (اختياري)", mapTitle: "أماكن ليونيدا", mapSub: "المناطق المؤكدة رسميًا من Rockstar Games", showcaseTitle: "المركبات، الأسلحة والملابس", showcaseSub: "معاينة رسمية لإصدار Ultimate",
    catTenue: "ملابس", catVehicule: "مركبة",
    aiTitle: "المساعد الذكي — راي", aiSub: "اطرح أسئلتك عن GTA 6 (معلومات رسمية ونقاش عام)",
    aiPlaceholder: "اسأل راي...", aiWelcome: "مرحبًا! أنا راي 🤙 اسألني أي شيء عن GTA 6: البيئة، الشخصيات، التواريخ، الآليات المحتملة...",
    loginPseudo: "الاسم المستخدم", loginPin: "رمز PIN (4 إلى 6 أرقام)", loginCountry: "البلد (اختياري، مثل SA)",
    loginSubmit: "تسجيل الدخول", registerSubmit: "إنشاء حسابي",
    logout: "تسجيل الخروج", needAccount: "سجل الدخول للمشاركة",
    footerText: "تطبيق مجتمعي غير رسمي. غير منتسب إلى Rockstar Games أو Take-Two Interactive.",
    close: "إغلاق", loading: "جارٍ التحميل...", empty: "لا يوجد شيء لعرضه الآن.",
    typing: "راي يفكر...",
    scoreEarned: "نقاط مكتسبة", correct: "إجابة صحيحة!", incorrect: "إجابة خاطئة.", teaserTitle: "المقطع الدعائي الرسمي", teaserSub: "مقطع دعائي نشرته Rockstar Games على يوتيوب", quizTimeLeft: "الوقت المتبقي", quizBestTime: "أفضل وقت", quizYourTime: "وقتك", quizNewRecord: "رقم قياسي جديد!",
    facts: [
      {q:"تاريخ الإصدار", a:"19 نوفمبر 2026، على PS5 و Xbox Series X|S."},
      {q:"الاستوديو", a:"تطوير Rockstar Games، ونشر Take-Two Interactive."},
      {q:"البيئة", a:"ولاية ليونيدا الخيالية (مستوحاة من فلوريدا)، وفايس سيتي هي المدينة الرئيسية."},
      {q:"الشخصيتان الرئيسيتان", a:"لوسيا كامينوس وجيسون دوفال، ثنائي على طراز بوني وكلايد."},
      {q:"السعر", a:"79.99 دولارًا (النسخة العادية) / 99.99 دولارًا (نسخة Ultimate)."}
    ]
  },
  zh: {
    tag: "非官方粉丝应用",
    heroTitle1: "GTA 6", heroTitleAccent: "社区",
    heroDesc: "全球排行榜、实时聊天、问答测验、服装和载具展示区，以及专属AI助手。这是2026年11月19日发布前粉丝们的聚集地。",
    statMembers: "成员", statMsgs: "发送的消息", statDays: "距发布的天数", statHours: "小时", statMinutes: "分钟", statSeconds: "秒",
    navHome: "首页", navRank: "排行榜", navChat: "聊天", navQuiz: "问答", navGallery: "图库", navAI: "AI助手", navMap: "地点",
    loginBtn: "登录", createAccount: "创建账户",
    infoTitle: "GTA 6 概览", infoSub: "由Rockstar / Take-Two官方确认的信息",
    rankTitle: "全球排行榜", rankSub: "回答问答赢取积分",
    chatTitle: "社区聊天", chatSub: "与全世界的粉丝实时聊天",
    chatPlaceholder: "输入你的消息...", chatSend: "发送",
    quizTitle: "GTA 6 问答", quizSub: "测试你的知识并提升排名",
    quizStart: "开始问答", quizNext: "下一题", quizFinish: "查看我的分数",
    quizResultTitle: "结果", quizScoreOf: "共",
    galleryTitle: "社区图库", gallerySub: "展示你的服装或载具",
    galleryAdd: "发布", galleryImgUrl: "图片链接 (URL)", galleryCategory: "分类", galleryCaption: "说明 (可选)", mapTitle: "利奥尼达地点", mapSub: "由Rockstar Games官方确认的地区", showcaseTitle: "载具、武器和服装", showcaseSub: "终极版官方预览",
    catTenue: "服装", catVehicule: "载具",
    aiTitle: "AI助手 — Ray", aiSub: "提出关于GTA 6的问题 (官方信息及一般讨论)",
    aiPlaceholder: "问Ray...", aiWelcome: "你好！我是Ray 🤙 问我任何关于GTA 6的问题：背景设定、角色、日期、可能的玩法机制...",
    loginPseudo: "昵称", loginPin: "PIN码 (4到6位数字)", loginCountry: "国家 (可选，例如 CN)",
    loginSubmit: "登录", registerSubmit: "创建我的账户",
    logout: "登出", needAccount: "登录后参与",
    footerText: "非官方粉丝社区应用。与Rockstar Games或Take-Two Interactive无关联。",
    close: "关闭", loading: "加载中...", empty: "目前没有内容可显示。",
    typing: "Ray正在思考...",
    scoreEarned: "获得积分", correct: "回答正确！", incorrect: "回答错误。", teaserTitle: "官方预告片", teaserSub: "Rockstar Games在YouTube发布的预告片", quizTimeLeft: "剩余时间", quizBestTime: "最佳时间", quizYourTime: "你的时间", quizNewRecord: "新纪录！",
    facts: [
      {q:"发布日期", a:"2026年11月19日，登陆PS5和Xbox Series X|S。"},
      {q:"开发商", a:"由Rockstar Games开发，Take-Two Interactive发行。"},
      {q:"背景设定", a:"虚构的利奥尼达州（灵感来自佛罗里达），主要城市为罪恶城 (Vice City)。"},
      {q:"主角", a:"露西亚·卡米诺斯和杰森·杜瓦尔，邦妮与克莱德式的搭档。"},
      {q:"价格", a:"79.99美元（标准版）/ 99.99美元（终极版）。"}
    ]
  },
  ja: {
    tag: "非公式ファンアプリ",
    heroTitle1: "GTA 6", heroTitleAccent: "コミュニティ",
    heroDesc: "世界ランキング、ライブチャット、クイズ、服装・車両ギャラリー、専用AIアシスタント。2026年11月19日の発売前にファンが集う場所です。",
    statMembers: "メンバー", statMsgs: "送信されたメッセージ", statDays: "発売までの日数", statHours: "時間", statMinutes: "分", statSeconds: "秒",
    navHome: "ホーム", navRank: "ランキング", navChat: "チャット", navQuiz: "クイズ", navGallery: "ギャラリー", navAI: "AIアシスタント", navMap: "場所",
    loginBtn: "ログイン", createAccount: "アカウント作成",
    infoTitle: "GTA 6の概要", infoSub: "Rockstar / Take-Twoが公式に確認した情報",
    rankTitle: "世界ランキング", rankSub: "クイズに答えてポイントを獲得",
    chatTitle: "コミュニティチャット", chatSub: "世界中のファンとリアルタイムでチャット",
    chatPlaceholder: "メッセージを入力...", chatSend: "送信",
    quizTitle: "GTA 6クイズ", quizSub: "知識を試してランキングを上げよう",
    quizStart: "クイズを始める", quizNext: "次の質問", quizFinish: "スコアを見る",
    quizResultTitle: "結果", quizScoreOf: "点中",
    galleryTitle: "コミュニティギャラリー", gallerySub: "あなたの服装や車両を見せよう",
    galleryAdd: "投稿", galleryImgUrl: "画像リンク (URL)", galleryCategory: "カテゴリー", galleryCaption: "キャプション (任意)", mapTitle: "レオニダの場所", mapSub: "Rockstar Gamesが公式に確認した地域", showcaseTitle: "車両、武器、服装", showcaseSub: "アルティメットエディションの公式プレビュー",
    catTenue: "服装", catVehicule: "車両",
    aiTitle: "AIアシスタント — Ray", aiSub: "GTA 6について質問しよう (公式情報や一般的な会話)",
    aiPlaceholder: "Rayに聞く...", aiWelcome: "やあ！僕はRayだよ 🤙 GTA 6について何でも聞いてね：舞台設定、キャラクター、発売日、想定されるゲームシステムなど...",
    loginPseudo: "ユーザー名", loginPin: "PINコード (4〜6桁)", loginCountry: "国 (任意、例: JP)",
    loginSubmit: "ログイン", registerSubmit: "アカウントを作成",
    logout: "ログアウト", needAccount: "参加するにはログインしてください",
    footerText: "非公式のファンコミュニティアプリです。Rockstar GamesおよびTake-Two Interactiveとは関係ありません。",
    close: "閉じる", loading: "読み込み中...", empty: "現在表示できるものはありません。",
    typing: "Rayが考えています...",
    scoreEarned: "獲得ポイント", correct: "正解！", incorrect: "不正解。", teaserTitle: "公式トレーラー", teaserSub: "Rockstar GamesがYouTubeで公開したトレーラー", quizTimeLeft: "残り時間", quizBestTime: "ベストタイム", quizYourTime: "あなたのタイム", quizNewRecord: "新記録！",
    facts: [
      {q:"発売日", a:"2026年11月19日、PS5およびXbox Series X|S向け。"},
      {q:"スタジオ", a:"Rockstar Games開発、Take-Two Interactive発売。"},
      {q:"舞台設定", a:"架空の州レオニダ（フロリダをモデルにした）、主要都市はヴァイスシティ。"},
      {q:"主人公", a:"ルシア・カミノスとジェイソン・デュヴァル、ボニー＆クライド風のデュオ。"},
      {q:"価格", a:"79.99ドル（スタンダード版）／99.99ドル（アルティメット版）。"}
    ]
  },
  ko: {
    tag: "비공식 팬 애플리케이션",
    heroTitle1: "GTA 6", heroTitleAccent: "커뮤니티",
    heroDesc: "전 세계 순위표, 실시간 채팅, 퀴즈, 의상 및 차량 갤러리, 전용 AI 어시스턴트. 2026년 11월 19일 출시 전 팬들이 모이는 공간입니다.",
    statMembers: "회원", statMsgs: "전송된 메시지", statDays: "출시까지 남은 일수", statHours: "시간", statMinutes: "분", statSeconds: "초",
    navHome: "홈", navRank: "순위표", navChat: "채팅", navQuiz: "퀴즈", navGallery: "갤러리", navAI: "AI 어시스턴트", navMap: "장소",
    loginBtn: "로그인", createAccount: "계정 만들기",
    infoTitle: "GTA 6 총정리", infoSub: "Rockstar / Take-Two가 공식 확인한 정보",
    rankTitle: "전 세계 순위표", rankSub: "퀴즈에 답하고 포인트를 획득하세요",
    chatTitle: "커뮤니티 채팅", chatSub: "전 세계 팬들과 실시간으로 채팅하세요",
    chatPlaceholder: "메시지를 입력하세요...", chatSend: "보내기",
    quizTitle: "GTA 6 퀴즈", quizSub: "지식을 테스트하고 순위를 올리세요",
    quizStart: "퀴즈 시작", quizNext: "다음 질문", quizFinish: "내 점수 보기",
    quizResultTitle: "결과", quizScoreOf: "중",
    galleryTitle: "커뮤니티 갤러리", gallerySub: "당신의 의상이나 차량을 보여주세요",
    galleryAdd: "게시", galleryImgUrl: "이미지 링크 (URL)", galleryCategory: "카테고리", galleryCaption: "설명 (선택 사항)", mapTitle: "레오니다의 장소", mapSub: "Rockstar Games가 공식 확인한 지역", showcaseTitle: "차량, 무기 및 의상", showcaseSub: "얼티밋 에디션 공식 프리뷰",
    catTenue: "의상", catVehicule: "차량",
    aiTitle: "AI 어시스턴트 — Ray", aiSub: "GTA 6에 대해 질문하세요 (공식 정보 및 일반 대화)",
    aiPlaceholder: "Ray에게 물어보세요...", aiWelcome: "안녕하세요! 저는 Ray예요 🤙 GTA 6에 대해 무엇이든 물어보세요: 배경, 캐릭터, 날짜, 예상 게임 메커닉 등...",
    loginPseudo: "닉네임", loginPin: "PIN 코드 (4~6자리)", loginCountry: "국가 (선택 사항, 예: KR)",
    loginSubmit: "로그인", registerSubmit: "계정 생성",
    logout: "로그아웃", needAccount: "참여하려면 로그인하세요",
    footerText: "비공식 팬 커뮤니티 앱입니다. Rockstar Games 또는 Take-Two Interactive와 관련이 없습니다.",
    close: "닫기", loading: "로딩 중...", empty: "현재 표시할 내용이 없습니다.",
    typing: "Ray가 생각 중입니다...",
    scoreEarned: "획득한 포인트", correct: "정답입니다!", incorrect: "오답입니다.", teaserTitle: "공식 트레일러", teaserSub: "Rockstar Games가 YouTube에 공개한 트레일러", quizTimeLeft: "남은 시간", quizBestTime: "최고 기록", quizYourTime: "당신의 기록", quizNewRecord: "신기록!",
    facts: [
      {q:"출시일", a:"2026년 11월 19일, PS5 및 Xbox Series X|S로 출시."},
      {q:"스튜디오", a:"Rockstar Games 개발, Take-Two Interactive 배급."},
      {q:"배경", a:"플로리다에서 영감을 받은 가상의 주 레오니다, 메인 도시는 바이스 시티."},
      {q:"주인공", a:"루시아 카미노스와 제이슨 듀발, 보니 앤 클라이드 스타일의 듀오."},
      {q:"가격", a:"79.99달러 (스탠다드 에디션) / 99.99달러 (얼티밋 에디션)."}
    ]
  },
  hi: {
    tag: "अनौपचारिक फैन एप्लिकेशन",
    heroTitle1: "समुदाय", heroTitleAccent: "GTA 6",
    heroDesc: "विश्व रैंकिंग, लाइव चैट, क्विज़, आउटफिट और वाहन गैलरी, और एक समर्पित AI सहायक। 19 नवंबर 2026 से पहले फैंस का मिलन स्थल।",
    statMembers: "सदस्य", statMsgs: "भेजे गए संदेश", statDays: "रिलीज़ में शेष दिन", statHours: "घंटे", statMinutes: "मिनट", statSeconds: "सेकंड",
    navHome: "होम", navRank: "रैंकिंग", navChat: "चैट", navQuiz: "क्विज़", navGallery: "गैलरी", navAI: "AI सहायक", navMap: "स्थान",
    loginBtn: "लॉग इन करें", createAccount: "खाता बनाएं",
    infoTitle: "GTA 6 की जानकारी", infoSub: "Rockstar / Take-Two द्वारा आधिकारिक रूप से पुष्टि की गई जानकारी",
    rankTitle: "विश्व रैंकिंग", rankSub: "क्विज़ का जवाब देकर अंक कमाएं",
    chatTitle: "सामुदायिक चैट", chatSub: "दुनिया भर के फैंस के साथ लाइव चैट करें",
    chatPlaceholder: "अपना संदेश लिखें...", chatSend: "भेजें",
    quizTitle: "GTA 6 क्विज़", quizSub: "अपने ज्ञान का परीक्षण करें और रैंकिंग में ऊपर जाएं",
    quizStart: "क्विज़ शुरू करें", quizNext: "अगला प्रश्न", quizFinish: "मेरा स्कोर देखें",
    quizResultTitle: "परिणाम", quizScoreOf: "में से",
    galleryTitle: "सामुदायिक गैलरी", gallerySub: "अपना आउटफिट या वाहन दिखाएं",
    galleryAdd: "पोस्ट करें", galleryImgUrl: "इमेज लिंक (URL)", galleryCategory: "श्रेणी", galleryCaption: "कैप्शन (वैकल्पिक)", mapTitle: "लियोनिडा के स्थान", mapSub: "Rockstar Games द्वारा आधिकारिक रूप से पुष्टि किए गए क्षेत्र", showcaseTitle: "वाहन, हथियार और आउटफिट", showcaseSub: "अल्टीमेट एडिशन का आधिकारिक पूर्वावलोकन",
    catTenue: "आउटफिट", catVehicule: "वाहन",
    aiTitle: "AI सहायक — Ray", aiSub: "GTA 6 के बारे में अपने सवाल पूछें (आधिकारिक जानकारी और सामान्य चर्चा)",
    aiPlaceholder: "Ray से पूछें...", aiWelcome: "नमस्ते! मैं Ray हूं 🤙 GTA 6 के बारे में मुझसे कुछ भी पूछें: सेटिंग, किरदार, तारीखें, संभावित गेमप्ले मैकेनिक्स...",
    loginPseudo: "उपयोगकर्ता नाम", loginPin: "PIN कोड (4 से 6 अंक)", loginCountry: "देश (वैकल्पिक, जैसे IN)",
    loginSubmit: "लॉग इन करें", registerSubmit: "मेरा खाता बनाएं",
    logout: "लॉग आउट करें", needAccount: "भाग लेने के लिए लॉग इन करें",
    footerText: "अनौपचारिक फैन समुदाय ऐप। Rockstar Games या Take-Two Interactive से संबद्ध नहीं।",
    close: "बंद करें", loading: "लोड हो रहा है...", empty: "अभी दिखाने के लिए कुछ नहीं है।",
    typing: "Ray सोच रहा है...",
    scoreEarned: "अंक प्राप्त हुए", correct: "सही उत्तर!", incorrect: "गलत उत्तर।", teaserTitle: "आधिकारिक ट्रेलर", teaserSub: "Rockstar Games द्वारा YouTube पर प्रकाशित ट्रेलर", quizTimeLeft: "बचा हुआ समय", quizBestTime: "सर्वश्रेष्ठ समय", quizYourTime: "आपका समय", quizNewRecord: "नया रिकॉर्ड!",
    facts: [
      {q:"रिलीज़ की तारीख", a:"19 नवंबर 2026, PS5 और Xbox Series X|S पर।"},
      {q:"स्टूडियो", a:"Rockstar Games द्वारा विकसित, Take-Two Interactive द्वारा प्रकाशित।"},
      {q:"सेटिंग", a:"काल्पनिक राज्य लियोनिडा (फ्लोरिडा से प्रेरित), मुख्य शहर वाइस सिटी है।"},
      {q:"मुख्य किरदार", a:"लूसिया कैमिनोस और जेसन डुवाल, बोनी और क्लाइड जैसी जोड़ी।"},
      {q:"कीमत", a:"79.99 डॉलर (स्टैंडर्ड एडिशन) / 99.99 डॉलर (अल्टीमेट एडिशन)।"}
    ]
  }
};

/* ============ QUIZ DATA (bilingual, officially confirmed facts only) ============ */
const QUIZ = [
  {
    fr:{q:"À quelle date GTA 6 doit-il sortir ?", opts:["19 novembre 2026","25 décembre 2026","1er mai 2026","19 novembre 2025"]},
    en:{q:"What is the official release date of GTA 6?", opts:["November 19, 2026","December 25, 2026","May 1, 2026","November 19, 2025"]},
    correct:0
  },
  {
    fr:{q:"Sur quelles plateformes GTA 6 sort-il en premier ?", opts:["PS5 et Xbox Series X|S","PC uniquement","Switch 2","PS4 et Xbox One"]},
    en:{q:"Which platforms does GTA 6 launch on first?", opts:["PS5 and Xbox Series X|S","PC only","Switch 2","PS4 and Xbox One"]},
    correct:0
  },
  {
    fr:{q:"Comment s'appelle l'État fictif où se déroule GTA 6 ?", opts:["Leonida","San Andreas","Liberty State","Alderney"]},
    en:{q:"What is the fictional state GTA 6 is set in?", opts:["Leonida","San Andreas","Liberty State","Alderney"]},
    correct:0
  },
  {
    fr:{q:"Quelle est la ville principale de GTA 6 ?", opts:["Vice City","Liberty City","Los Santos","San Fierro"]},
    en:{q:"What is the main city in GTA 6?", opts:["Vice City","Liberty City","Los Santos","San Fierro"]},
    correct:0
  },
  {
    fr:{q:"Qui sont les deux protagonistes jouables ?", opts:["Lucia Caminos et Jason Duval","Michael et Trevor","Niko et Roman","CJ et Big Smoke"]},
    en:{q:"Who are the two playable protagonists?", opts:["Lucia Caminos and Jason Duval","Michael and Trevor","Niko and Roman","CJ and Big Smoke"]},
    correct:0
  },
  {
    fr:{q:"Quelle particularité a Lucia dans la saga GTA ?", opts:["Première protagoniste jouable de l'ère HD en solo","Elle est un personnage secondaire","C'est un personnage jouable en ligne uniquement","Elle apparaissait déjà dans GTA V"]},
    en:{q:"What's notable about Lucia in the GTA series?", opts:["First solo playable female protagonist of the HD era","She's a minor side character","Only playable in online mode","She already appeared in GTA V"]},
    correct:0
  },
  {
    fr:{q:"Qui développe GTA 6 ?", opts:["Rockstar Games","Ubisoft","EA","CD Projekt Red"]},
    en:{q:"Who is developing GTA 6?", opts:["Rockstar Games","Ubisoft","EA","CD Projekt Red"]},
    correct:0
  },
  {
    fr:{q:"Quel est le jeu précédent de la saga principale ?", opts:["Grand Theft Auto V (2013)","Grand Theft Auto IV","Red Dead Redemption 2","GTA Online"]},
    en:{q:"What was the previous mainline entry in the series?", opts:["Grand Theft Auto V (2013)","Grand Theft Auto IV","Red Dead Redemption 2","GTA Online"]},
    correct:0
  }
];

/* ============ STATE ============ */
const state = {
  lang: localStorage.getItem('g6_lang') || (navigator.language.startsWith('fr') ? 'fr' : 'en'), theme: localStorage.getItem('g6_theme') || 'dark', user: null, tab: 'home',
  showAuth: false,
  authMode: 'login',
  authError: null,
  leaderboard: [],
  chatMessages: [],
  galleryItems: [],
  quizIndex: 0,
  quizScore: 0,
  quizAnswered: null,
  quizActive: false,
  quizData: null,
  quizLoading: false,
  quizStartTime: null,
  quizTimeLeft: null,
  quizLastTime: null,
  quizSessionId: null,
  quizAnswers: [],
  quizCorrectIndex: null,
  quizChecking: false,
  aiMessages: [],
  aiTyping: false,
  toastMsg: null
};

const LANGS = [
  {code:'fr', name:'Français'}, {code:'en', name:'English'}, {code:'es', name:'Español'}, {code:'pt', name:'Português'}, {code:'de', name:'Deutsch'}, {code:'it', name:'Italiano'}, {code:'ru', name:'Русский'}, {code:'ar', name:'العربية'}, {code:'zh', name:'中文'}, {code:'ja', name:'日本語'}, {code:'ko', name:'한국어'}, {code:'hi', name:'हिन्दी'}
];
function t(key){ return (I18N[state.lang] && I18N[state.lang][key] !== undefined) ? I18N[state.lang][key] : I18N.en[key]; }
function setLang(l){ state.lang = l; localStorage.setItem('g6_lang', l); document.documentElement.lang = l; document.documentElement.dir = (l==='ar') ? 'rtl' : 'ltr'; render(); } function toggleTheme(){ state.theme = state.theme==='light' ? 'dark' : 'light'; localStorage.setItem('g6_theme', state.theme); document.documentElement.setAttribute('data-theme', state.theme); render(); } function showAgeGate(){ const div = document.createElement('div'); div.id = 'ageGate'; div.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;'; div.innerHTML = '<div style="max-width:480px;background:var(--bg-panel);border:1px solid var(--line);border-radius:16px;padding:28px;text-align:center;"><div style="font-size:40px;margin-bottom:12px;">🔞</div><h2 style="margin:0 0 12px;color:var(--text);">'+esc(t('ageGateTitle'))+'</h2><p style="color:var(--text-dim);margin:0 0 20px;line-height:1.5;">'+esc(t('ageGateText'))+'</p><div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;"><button id="ageGateConfirmBtn" style="background:var(--magenta);color:#fff;border:none;border-radius:999px;padding:10px 20px;cursor:pointer;font-weight:700;">'+esc(t('ageGateConfirm'))+'</button><button id="ageGateLeaveBtn" style="background:transparent;color:var(--text-dim);border:1px solid var(--line);border-radius:999px;padding:10px 20px;cursor:pointer;">'+esc(t('ageGateLeave'))+'</button></div></div>'; document.body.appendChild(div); document.getElementById('ageGateConfirmBtn').onclick = function(){ localStorage.setItem('g6_age_verified','true'); div.remove(); }; document.getElementById('ageGateLeaveBtn').onclick = function(){ window.location.href = 'https://www.google.com'; }; }
function showToast(msg){ state.toastMsg = msg; render(); setTimeout(()=>{ state.toastMsg=null; render(); }, 2600); }

async function api(path, opts){
  const res = await fetch('/api/' + path, opts);
  let data = {};
  try { data = await res.json(); } catch {}
  if (!res.ok) throw new Error(data.error || ('Erreur ' + res.status));
  return data;
}

/* ============ AUTH ============ */
async function doAuth(action, payload){
  try{
    if (action === 'register') {
      const { email, password, username, country } = payload;
      if (!username || !/^[a-zA-Z0-9_-]{3,18}$/.test(username)) throw new Error(state.lang==='fr' ? 'Pseudo invalide (3-18 caractères, lettres/chiffres/_/-)' : 'Invalid username (3-18 chars, letters/digits/_/-)');
      if (!password || password.length < 6) throw new Error(state.lang==='fr' ? 'Mot de passe trop court (6 caractères min)' : 'Password too short (min 6 characters)');
      localStorage.setItem('g6_pending_profile', JSON.stringify({ username, region: country || 'EU-West' }));
      const { data, error } = await supabaseClient.auth.signUp({ email, password });
      if (error) throw error;
      if (data.session) {
        const player = await ensurePlayerRow(data.session.user);
        state.user = playerToUser(player);
        state.showAuth = false;
        showToast(state.lang==='fr' ? 'Bienvenue ' + player.username + ' !' : 'Welcome ' + player.username + '!');
        loadLeaderboard();
      } else {
        state.showAuth = false;
        showToast(state.lang==='fr' ? 'Compte créé ! Vérifie tes emails pour confirmer, puis connecte-toi.' : 'Account created! Check your email to confirm, then log in.');
      }
      render();
      return;
    }

    const { email, password } = payload;
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;
    const player = await ensurePlayerRow(data.session.user);
    if (player.is_banned) { await supabaseClient.auth.signOut(); throw new Error(state.lang==='fr' ? 'Ce compte a été suspendu.' : 'This account has been suspended.'); }
    state.user = playerToUser(player);
    state.showAuth = false;
    showToast(state.lang==='fr' ? 'Bienvenue ' + player.username + ' !' : 'Welcome ' + player.username + '!');
    render();
    loadLeaderboard();
  } catch(e){
    state.authError = e.message;
    render();
  }
}
function logout(){
  supabaseClient.auth.signOut();
  state.user = null;
  render();
}

/* ============ DATA LOADERS ============ */
async function loadLeaderboard(){
  try{
    const { data, error } = await supabaseClient
      .from('players')
      .select('username, region, hustle_score, best_quiz_time')
      .eq('is_banned', false)
      .order('hustle_score', { ascending: false })
      .limit(100);
    if (error) throw error;
    state.leaderboard = (data || []).map(p => ({ pseudo: p.username, country: p.region || '??', score: p.hustle_score || 0, bestTime: p.best_quiz_time || null }));
    render();
  }catch(e){}
}
async function loadChat(){
  try{ const d = await api('chat'); state.chatMessages = (d.messages || []).map(m => ({ pseudo: m.username, country: m.country, text: m.content })); render(); }catch(e){}
}
async function loadGallery(){
  try{ const d = await api('gallery'); state.galleryItems = d.items || []; render(); }catch(e){}
}

async function sendChat(text){
  if (!state.user){ state.showAuth = true; state.authMode='login'; render(); return; }
  if (!text.trim()) return;
  try{
    const token = await authToken();
    await api('chat', {method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ token, text })});
  } catch(e){ showToast(e.message); }
}
async function postGallery(imageUrl, category, caption){
  if (!state.user){ state.showAuth = true; render(); return; }
  try{
    await api('gallery', {method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({pseudo: state.user.pseudo, token: await authToken(), imageUrl, category, caption})});
    await loadGallery();
    showToast(state.lang==='fr' ? 'Publié !' : 'Posted!');
  } catch(e){ showToast(e.message); }
}

async function likeGallery(id){
  if (!state.user){ state.showAuth = true; render(); return; }
  try{
    await api('gallery', {method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({action:'like', id, pseudo: state.user.pseudo, token: await authToken()})});
    await loadGallery();
  } catch(e){ showToast(e.message); }
}

async function reportGallery(id){
  if (!state.user){ state.showAuth = true; render(); return; }
  try{
    await api('gallery', {method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({action:'report', id, pseudo: state.user.pseudo, token: await authToken()})});
    showToast(t('reportSent'));
  } catch(e){ showToast(e.message); }
}

    async function submitQuizScore(){
  if (!state.quizSessionId) return;
  try{
    const token = await authToken();
    const d = await api('quiz', {method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ action: 'submit', token, sessionId: state.quizSessionId, answers: state.quizAnswers, time: state.quizLastTime })});
    if (state.user && d.player) {
      state.user.score = d.player.hustle_score;
      state.user.bestTime = d.player.best_quiz_time;
      state.user.quizzesTaken = d.player.quizzes_taken;
    }
    loadLeaderboard();
  } catch(e){}
}
async function sendAI(text){
  if (!text.trim()) return;
  state.aiMessages.push({role:'user', content:text});
  state.aiTyping = true;
  render();
  try{
    const d = await api('ai-chat', {method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({messages: state.aiMessages})});
    state.aiMessages.push({role:'assistant', content: d.reply});
  } catch(e){
    state.aiMessages.push({role:'assistant', content: (state.lang==='fr' ? 'Erreur : ' : 'Error: ') + e.message});
  }
  state.aiTyping = false;
  render();
}

/* ============ QUIZ LOGIC ============ */
      let quizTimerId = null;
      const QUIZ_QUESTION_SECONDS = 20;
      function clearQuizTimer(){ if (quizTimerId){ clearInterval(quizTimerId); quizTimerId = null; } }
      function startQuestionTimer(){
              clearQuizTimer();
              state.quizTimeLeft = QUIZ_QUESTION_SECONDS;
              quizTimerId = setInterval(() => {
                        state.quizTimeLeft--;
                        const el = document.getElementById('quiz-timer-val');
                        if (el) el.textContent = state.quizTimeLeft;
                        if (state.quizTimeLeft <= 0){
                                    clearQuizTimer();
                                    if (state.quizAnswered === null) state.quizAnswered = -1;
                                    nextQuiz();
                        }
              }, 1000);
      }
      function fmtTime(sec){
              if (sec == null) return '--';
              const m = Math.floor(sec / 60); const s = sec % 60;
              return m + ':' + (s < 10 ? '0' : '') + s;
      }
function startQuiz(){
  state.quizActive = true; state.quizIndex = 0; state.quizScore = 0; state.quizAnswered = null; state.quizData = null; state.quizLoading = true; state.quizStartTime = Date.now();
  state.quizSessionId = null; state.quizAnswers = []; state.quizCorrectIndex = null;
  render();
  (async () => {
    try {
      const token = await authToken();
      const d = await api('quiz', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action: 'start', lang: state.lang, token })});
      state.quizSessionId = d.sessionId;
      state.quizData = d.questions;
      state.quizLoading = false;
      render(); startQuestionTimer();
    } catch(e) {
      state.quizData = QUIZ.map(q => ({ question: (q[state.lang]||q.en).q, choices: (q[state.lang]||q.en).opts, note: 'officiel', answerIndex: q.correct }));
      state.quizSessionId = null;
      state.quizLoading = false;
      render(); startQuestionTimer();
    }
  })();
}
function answerQuiz(idx){
  if (state.quizAnswered !== null || !state.quizData || state.quizChecking) return;
  state.quizAnswers[state.quizIndex] = idx;
  clearQuizTimer();
  if (!state.quizSessionId) {
    const ai = state.quizData[state.quizIndex].answerIndex;
    state.quizAnswered = idx;
    state.quizCorrectIndex = (ai !== undefined && ai !== null) ? ai : idx;
    if (ai === idx) state.quizScore++;
    render();
    return;
  }
  state.quizChecking = true; render();
  api('quiz', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action: 'check', sessionId: state.quizSessionId, index: state.quizIndex, choice: idx })})
    .then(d => {
      state.quizChecking = false;
      state.quizAnswered = idx;
      state.quizCorrectIndex = d.correctIndex;
      if (d.correct) state.quizScore++;
      render();
    })
    .catch(() => {
      state.quizChecking = false;
      state.quizAnswered = idx;
      state.quizCorrectIndex = idx;
      render();
    });
}
function nextQuiz(){
if (state.quizIndex + 1 >= state.quizData.length){          clearQuizTimer();
          const elapsed = Math.round((Date.now() - (state.quizStartTime || Date.now())) / 1000);
          state.quizLastTime = elapsed;
    submitQuizScore();
    state.quizActive = false;
    state.quizFinished = true;
    render();
    return;
  }
  state.quizIndex++;
  state.quizAnswered = null; state.quizCorrectIndex = null; startQuestionTimer();
  render();
}
function restartQuiz(){ state.quizFinished = false; startQuiz(); } function shareScore(){ const msg = "J'ai obtenu " + state.quizScore + "/5 au quiz GTA6 HUB ! " + window.location.href; const fallback = function(){ window.open("https://x.com/intent/tweet?text=" + encodeURIComponent(msg), "_blank"); showToast(t("shareFallbackMsg")); }; if (navigator.share) { navigator.share({text: msg}).catch(fallback); } else { fallback(); } }

/* ============ RENDER ============ */
function el(html){ const d = document.createElement('div'); d.innerHTML = html; return d.firstElementChild; }
function esc(s){ return String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function mdToHtml(str){
  let s = esc(str);
  s = s.replace(/^### (.*)$/gm, '<strong>$1</strong>');
  s = s.replace(/^## (.*)$/gm, '<strong>$1</strong>');
  s = s.replace(/^# (.*)$/gm, '<strong>$1</strong>');
  s = s.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  s = s.replace(/\n/g, '<br>');
  return s;
}

function releaseCountdown(){
  const target = new Date('2026-11-19T00:00:00Z').getTime();
  let diff = target - Date.now();
  if (diff < 0) diff = 0;
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return { days, hours, minutes, seconds };
}

function updateCountdownDisplay(){
  const cd = releaseCountdown();
  const elD = document.getElementById('cdDays');
  const elH = document.getElementById('cdHours');
  const elM = document.getElementById('cdMinutes');
  const elS = document.getElementById('cdSeconds');
  if (elD) elD.textContent = cd.days;
  if (elH) elH.textContent = String(cd.hours).padStart(2,'0');
  if (elM) elM.textContent = String(cd.minutes).padStart(2,'0');
  if (elS) elS.textContent = String(cd.seconds).padStart(2,'0');
}

function renderHeader(){
  return `
  <header class="top">
    <div class="logo"><span class="g6">GTA6</span><span class="hub">HUB</span><small>${esc(t('tag'))}</small></div>
    <div class="top-actions">
            <div class="lang-toggle">
        <select id="langSelect" style="background:var(--bg-panel);color:var(--text);border:1px solid var(--line);border-radius:999px;padding:6px 12px;font-family:'JetBrains Mono';font-size:12px;font-weight:700;">
          ${LANGS.map(function(lg){ return '<option value="'+lg.code+'"'+(state.lang===lg.code?' selected':'')+'>'+esc(lg.name)+'</option>'; }).join('')} </select> <button id="themeToggle" title="Theme" style="background:var(--bg-panel);color:var(--text);border:1px solid var(--line);border-radius:999px;padding:6px 10px;cursor:pointer;">${state.theme==='light'?'☀️':'🌙'}</button>
      </div>
      ${state.user ? `
        <div class="account-chip" id="accountChip">
          <div class="av">${esc(state.user.pseudo[0].toUpperCase())}</div>
          <span>${esc(state.user.pseudo)}</span>
        </div>
      ` : `<button class="btn btn-primary" id="openAuth">${esc(t('loginBtn'))}</button>`}
    </div>
  </header>`;
}

function renderTabs(){
  const tabs = [
    ['home', t('navHome'), '🏠'],
    ['rank', t('navRank'), '🏆'],
    ['chat', t('navChat'), '💬'],
    ['quiz', t('navQuiz'), '❓'],
    ['gallery', t('navGallery'), '🚗'],
    ['map', t('navMap'), '🗺️'],
    ['ai', t('navAI'), '🤖']
  ];
  return `<nav class="tabs">${tabs.map(([id,label,icon]) =>
    `<button data-tab="${id}" class="${state.tab===id?'active':''}">${icon} ${esc(label)}</button>`
  ).join('')}</nav>`;
}

function renderHome(){
  const cd = releaseCountdown();
  return `
  <div class="hero">
    <h1>${esc(t('heroTitle1'))} <span class="accent">${esc(t('heroTitleAccent'))}</span></h1>
    <p>${esc(t('heroDesc'))}</p>
    <div class="hero-stats">
      <div><div class="num">${state.leaderboard.length || '—'}</div><div class="lbl">${esc(t('statMembers'))}</div></div>
      <div><div class="num">${state.chatMessages.length || '—'}</div><div class="lbl">${esc(t('statMsgs'))}</div></div>
      <div><div class="num" id="cdDays">${cd.days}</div><div class="lbl">${esc(t('statDays'))}</div></div>
      <div><div class="num" id="cdHours">${String(cd.hours).padStart(2,'0')}</div><div class="lbl">${esc(t('statHours'))}</div></div>
      <div><div class="num" id="cdMinutes">${String(cd.minutes).padStart(2,'0')}</div><div class="lbl">${esc(t('statMinutes'))}</div></div>
      <div><div class="num" id="cdSeconds">${String(cd.seconds).padStart(2,'0')}</div><div class="lbl">${esc(t('statSeconds'))}</div></div>
    </div>
  </div>
        <div class="panel">
                <h2>${esc(t('teaserTitle'))}</h2>
                        <p class="sub">${esc(t('teaserSub'))}</p>
                                <div style="position:relative;padding-top:56.25%;border-radius:12px;overflow:hidden;">
                                          <iframe src="https://www.youtube.com/embed/QdBZY2fkU-0" title="GTA 6 Trailer" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%;"></iframe>
                                                                                            </div>
                                                                                                                              <p class="sub" style="margin-top:16px;">${esc(t('trailer2Label'))}</p>
                                                                                                                                                              <div style="position:relative;padding-top:56.25%;border-radius:12px;overflow:hidden;margin-top:8px;">
                                                                                                                                                                                                        <iframe src="https://www.youtube.com/embed/VQRLujxTm3c" title="GTA 6 Trailer 2" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%;"></iframe>
                                                                                                                                                                                                                                                          </div>
                                                                                                                                                                                                                                                                                                                  </div>
                                                                                                                                                                                                                                                                                                                    
  <div class="panel">
    <h2>${esc(t('preorderTitle'))}</h2>
    <p class="sub">${esc(t('preorderSub'))}</p>
    <a href="https://www.rockstargames.com/VI/editions" target="_blank" rel="noopener noreferrer" class="btn btn-primary" style="display:inline-block;margin-top:12px;text-decoration:none;">${esc(t('preorderBtn'))}</a>
  </div>
  <div class="panel">
    <h2>${esc(t('infoTitle'))}</h2>
    <p class="sub">${esc(t('infoSub'))}</p>
    ${t('facts').map(f => `
      <div class="lb-row" style="border-bottom:1px solid var(--line);">
        <div style="flex:1"><strong>${esc(f.q)}</strong><div style="color:var(--text-dim);font-size:13px;margin-top:3px;">${esc(f.a)}</div></div>
      </div>
      `).join('')}
<div class="panel">
          <h2>${esc(t('charactersTitle'))}</h2>
              <p class="sub">${esc(t('charactersSub'))}</p>
                  <div class="lb-row" style="border-bottom:1px solid var(--line);">
                        <div style="flex:1"><strong>${esc(t('charJasonName'))}</strong><div style="color:var(--text-dim);font-size:13px;margin-top:3px;">${esc(t('charJasonBio'))}</div></div>
                            </div>
                                <div class="lb-row">
                                      <div style="flex:1"><strong>${esc(t('charLuciaName'))}</strong><div style="color:var(--text-dim);font-size:13px;margin-top:3px;">${esc(t('charLuciaBio'))}</div></div></div></div><div class="panel"><h2>${esc(t('newsTitle'))}</h2><p class="sub">${esc(t('newsSub'))}</p>${(t('newsItems')||[]).map(n => `<div class="lb-row" style="border-bottom:1px solid var(--line);"><div style="flex:1"><strong>${esc(n.d)}</strong><div style="color:var(--text-dim);font-size:13px;margin-top:3px;">${esc(n.t)}</div></div></div>`).join('')}</div>
                                          
                                            </div>`;
  
                                            
}

  function renderRank(){
  const rows = state.leaderboard.map((u, i) => `
    <div class="lb-row">
      <div class="lb-rank">${i===0?'🥇':i===1?'🥈':i===2?'🥉':'#'+(i+1)}</div>
      <div class="lb-name">${esc(u.pseudo)} <span class="lb-country">${esc(u.country)}</span></div>
      <div class="lb-score">${u.score} pts</div>
              <div class="lb-country">${u.bestTime ? '⏱ ' + fmtTime(u.bestTime) : ''}</div>
    </div>
  `).join('') || `<div class="empty">${esc(t('empty'))}</div>`;
  return `<div class="panel"><h2>${esc(t('rankTitle'))}</h2><p class="sub">${esc(t('rankSub'))}</p>${rows}</div>`;
}

function renderChat(){
  const msgs = state.chatMessages.map(m => `
    <div class="msg ${state.user && m.pseudo===state.user.pseudo ? 'mine':''}">
      <div class="who">${esc(m.pseudo)} · ${esc(m.country)}</div>
      ${esc(m.text)}
    </div>
  `).join('') || `<div class="empty">${esc(t('empty'))}</div>`;
  return `
  <div class="panel">
    <h2>${esc(t('chatTitle'))}</h2>
    <p class="sub">${esc(t('chatSub'))}</p>
    <div class="chat-box" id="chatBox">${msgs}</div>
    <div class="chat-input">
      <input id="chatInput" placeholder="${esc(t('chatPlaceholder'))}" maxlength="500" ${state.user?'':'disabled'}/>
      <button class="btn btn-primary" id="chatSendBtn">${esc(t('chatSend'))}</button>
    </div>
    ${!state.user ? `<p class="sub" style="margin-top:10px;">${esc(t('needAccount'))}</p>` : ''}
  </div>`;
}

function renderQuiz(){
      if (state.quizFinished){
              return `
                    <div class="panel" style="text-align:center;">
                            <h2>${esc(t('quizResultTitle'))}</h2>
                                    <div style="font-family:'Anton';font-size:52px;color:var(--teal);margin:14px 0;">${state.quizScore} / ${(state.quizData||QUIZ).length}</div>
                                            <p class="sub">+${state.quizScore*15} ${esc(t('scoreEarned'))}</p>
                                                            <p class="sub">${esc(t('quizYourTime'))}: ${fmtTime(state.quizLastTime)}${state.user && state.user.bestTime ? ' &middot; ' + esc(t('quizBestTime')) + ': ' + fmtTime(state.user.bestTime) + (state.quizLastTime===state.user.bestTime ? ' \u{1F3C6} ' + esc(t('quizNewRecord')) : '') : ''}</p>
                                                    <button class="btn btn-primary" id="restartQuizBtn">${esc(t('quizStart'))}</button> <button class="btn btn-primary" id="shareScoreBtn" style="margin-left:8px;">${esc(t('shareScoreBtn'))}</button>
                                                          </div>`;
      }
      if (!state.quizActive){
              return `
                    <div class="panel" style="text-align:center;">
                            <h2>${esc(t('quizTitle'))}</h2>
                                    <p class="sub">${esc(t('quizSub'))}</p>
                                            <button class="btn btn-primary" id="startQuizBtn">${esc(t('quizStart'))}</button>
                                                    ${!state.user ? `<p class="sub" style="margin-top:14px;">${esc(t('needAccount'))}</p>` : ''}
                                                          </div>`;
      }
      if (state.quizLoading || !state.quizData){
              return `
                    <div class="panel" style="text-align:center;">
                            <h2>${esc(t('quizTitle'))}</h2>
                                    <p class="sub">${state.lang==='fr' ? 'Generation du quiz en cours...' : 'Generating quiz...'}</p>
                                          </div>`;
      }
      const data = state.quizData[state.quizIndex];
      const answered = state.quizAnswered;
      return `
          <div class="panel">
                <div class="quiz-progress">${state.quizIndex+1} / ${state.quizData.length}</div>
                          <div class="quiz-progress">⏱ ${esc(t('quizTimeLeft'))}: <span id="quiz-timer-val">${state.quizTimeLeft != null ? state.quizTimeLeft : QUIZ_QUESTION_SECONDS}</span>s</div>
                      <div class="quiz-q">${esc(data.question)}</div>
                            ${data.choices.map((opt, i) => {
                                      let cls = 'quiz-opt';
                                      if (answered !== null){
                                                  if (i === state.quizCorrectIndex) cls += ' correct';
                                                  else if (i === answered) cls += ' wrong';
                                      }
                                      return `<button class="${cls}" data-idx="${i}" ${answered!==null?'disabled':''}>${esc(opt)}</button>`;
                            }).join('')}
                                  ${answered !== null ? `<button class="btn btn-primary" id="nextQuizBtn" style="margin-top:10px;">${state.quizIndex+1 >= state.quizData.length ? esc(t('quizFinish')) : esc(t('quizNext'))}</button>` : ''}
                                      </div>`;
}

function renderGallery(){
  const items = state.galleryItems.map(it => `
    <div class="g-card">
      <img src="${esc(it.imageUrl)}" loading="lazy" data-imgfallback="dim"/>
      <div class="body">
        <div class="cat">${it.category==='tenue' ? esc(t('catTenue')) : esc(t('catVehicule'))}</div>
        <div class="cap">${esc(it.caption || '')}</div>
        <div class="foot">
          <span>@${esc(it.pseudo)}</span>
          <button class="like-btn ${state.user && it.likes.includes(state.user.pseudo)?'liked':''}" data-like="${it.id}">❤ ${it.likes.length}</button>
          <button class="like-btn" data-report="${it.id}" title="${esc(t('reportBtn'))}">🚩</button>
        </div>
      </div>
    </div>
  `).join('') || `<div class="empty">${esc(t('empty'))}</div>`;
  return `
  <div class="panel">
    <h2>${esc(t('galleryTitle'))}</h2>
    <p class="sub">${esc(t('gallerySub'))}</p>
    ${state.user ? `
      <div style="background:var(--bg);border:1px solid var(--line);border-radius:12px;padding:16px;margin-bottom:20px;">
        <div class="field"><label>${esc(t('galleryImgUrl'))}</label><input id="gImgUrl" placeholder="https://..."/></div>
        <div class="field"><label>${esc(t('galleryCategory'))}</label>
          <select id="gCategory">
            <option value="tenue">${esc(t('catTenue'))}</option>
            <option value="vehicule">${esc(t('catVehicule'))}</option>
          </select>
        </div>
        <div class="field"><label>${esc(t('galleryCaption'))}</label><input id="gCaption" maxlength="200"/></div>
        <button class="btn btn-teal" id="postGalleryBtn">${esc(t('galleryAdd'))}</button>
      </div>
    ` : `<p class="sub">${esc(t('needAccount'))}</p>`}
    <div class="gallery-grid">${items}</div>
  </div>`;
}

const LOCATIONS = [
{img:'lieu-vice-city-01.jpg', name:{fr:'Vice City', en:'Vice City'}, desc:{fr:"Ville principale de GTA 6.", en:"Main city of GTA 6."}},
{img:'lieu-leonida-keys.jpg', name:{fr:'Leonida Keys', en:'Leonida Keys'}, desc:{fr:"Archipel au sud de Vice City, lie a la contrebande.", en:"Archipelago south of Vice City, tied to smuggling."}},
{img:'lieu-port-gellhorn.jpg', name:{fr:'Port Gellhorn', en:'Port Gellhorn'}, desc:{fr:"Ville cotiere decatie vue des la premiere bande-annonce.", en:"Run-down coastal town seen since the first trailer."}},
{img:'lieu-ambrosia.jpg', name:{fr:'Ambrosia', en:'Ambrosia'}, desc:{fr:"Zone rurale associee aux clubs de bikers.", en:"Rural area associated with biker clubs."}},
{img:'lieu-grassrivers.jpg', name:{fr:'Grassrivers', en:'Grassrivers'}, desc:{fr:"Vastes marecages traverses en hydroglisseur.", en:"Vast swamps crossed by airboat."}},
{img:'lieu-mont-kalaga.jpg', name:{fr:'Mont Kalaga', en:'Mount Kalaga'}, desc:{fr:"Parc national montagneux.", en:"Mountainous national park."}}
];

const SHOWCASE = [
{img:'vehicule-grotti-cheetah.jpg', cap:{fr:'Grotti Cheetah', en:'Grotti Cheetah'}},
{img:'vehicule-vapid-ganado-retro.jpg', cap:{fr:'Vapid Ganado (retro)', en:'Vapid Ganado (retro)'}},
{img:'vehicule-squalo-bateau.jpg', cap:{fr:'Bateau Squalo', en:'Squalo boat'}},
{img:'vehicule-planque-jason.jpg', cap:{fr:'Planque de Jason', en:"Jason's safehouse"}},
{img:'vehicule-atelier-rideout-customs.jpg', cap:{fr:'Rideout Customs', en:'Rideout Customs'}},
{img:'arme-revolver-hawk-little-morgan.jpg', cap:{fr:'Hawk & Little Morgan', en:'Hawk & Little Morgan'}},
{img:'arme-variantes-personnalisees.jpg', cap:{fr:'Armes personnalisees', en:'Personalized weapons'}},
{img:'tenue-style-vice-city-01.jpg', cap:{fr:'Style Vice City', en:'Vice City style'}},
{img:'tenue-style-vice-city-02.jpg', cap:{fr:'Chemise Vice City', en:'Vice City shirt'}},
{img:'tenue-style-vice-city-03.jpg', cap:{fr:'Look Vice City', en:'Vice City look'}},
{img:'tenue-saras-salon.jpg', cap:{fr:"Salon de Sara", en:"Sara's Salon"}}
];

function renderMap(){
const rows = LOCATIONS.map(l => `
<div class="lb-row" style="border-bottom:1px solid var(--line);flex-direction:column;align-items:stretch;gap:10px;padding:14px 0;">
<img src="/images/${l.img}" loading="lazy" style="width:100%;max-height:320px;object-fit:cover;border-radius:12px;" data-imgfallback="hide"/>
<div><strong style="font-size:17px;">${esc((l.name[state.lang]||l.name.en))}</strong><div style="color:var(--text-dim);font-size:14px;margin-top:4px;">${esc((l.desc[state.lang]||l.desc.en))}</div></div>
</div>
`).join('');
const showcase = SHOWCASE.map(s => `
<div class="g-card">
<img src="/images/${s.img}" loading="lazy" data-imgfallback="dim"/>
<div class="body"><div class="cap">${esc((s.cap[state.lang]||s.cap.en))}</div></div>
</div>
`).join('');
return `
<div class="panel">
<h2>${esc(t('mapTitle'))}</h2>
<p class="sub">${esc(t('mapSub'))}</p>
${rows}
</div>
<div class="panel">
<h2>${esc(t('showcaseTitle'))}</h2>
<p class="sub">${esc(t('showcaseSub'))}</p>
<div class="gallery-grid">${showcase}</div>
</div>`;
}
function renderAI(){ 
  const msgs = state.aiMessages.length ? state.aiMessages.map(m => `
    <div class="ai-msg ${m.role}">
      <div class="tag">${m.role==='user' ? (state.user?state.user.pseudo:'You') : 'Ray'}</div>
      ${m.role==='assistant' ? mdToHtml(m.content) : esc(m.content)}
    </div>
  `).join('') : `<div class="ai-msg assistant"><div class="tag">Ray</div>${esc(t('aiWelcome'))}</div>`;
  return `
  <div class="panel">
    <h2>${esc(t('aiTitle'))}</h2>
    <p class="sub">${esc(t('aiSub'))}</p>
    <div class="ai-box" id="aiBox">${msgs}${state.aiTyping ? `<div class="ai-msg assistant"><div class="tag">Ray</div>${esc(t('typing'))}</div>`:''}</div>
    <div class="chat-input">
      <input id="aiInput" placeholder="${esc(t('aiPlaceholder'))}" ${state.aiTyping?'disabled':''}/>
      <button class="btn btn-primary" id="aiSendBtn" ${state.aiTyping?'disabled':''}>${esc(t('chatSend'))}</button>
    </div>
  </div>`;
}

function renderAuthModal(){
  if (!state.showAuth) return '';
  const mode = state.authMode;
  return `
  <div class="modal-overlay" id="modalOverlay">
    <div class="modal" style="position:relative;">
      <button class="close-x" id="closeAuth">✕</button>
      <h3>${mode==='login' ? esc(t('loginBtn')) : esc(t('createAccount'))}</h3>
      <p class="sub">GTA6 HUB</p>
      <div class="modal-tabs">
        <button data-mode="login" class="${mode==='login'?'active':''}">${esc(t('loginBtn'))}</button>
        <button data-mode="register" class="${mode==='register'?'active':''}">${esc(t('createAccount'))}</button>
      </div>
      ${mode==='register' ? `<div class="field"><label>${esc(t('loginPseudo'))}</label><input id="authUsername" maxlength="18"/></div>` : ''}
      <div class="field"><label>Email</label><input id="authEmail" type="email" maxlength="200"/></div>
      <div class="field"><label>${state.lang==='fr'?'Mot de passe':'Password'}</label><input id="authPassword" type="password" maxlength="72"/></div>
      ${mode==='register' ? `<div class="field"><label>${esc(t('loginCountry'))}</label><input id="authCountry" maxlength="2" placeholder="FR"/></div>` : ''}
      ${state.authError ? `<div class="error-msg">${esc(state.authError)}</div>` : ''}
      <button class="btn btn-primary" id="authSubmit" style="width:100%;">${mode==='login' ? esc(t('loginSubmit')) : esc(t('registerSubmit'))}</button>
    </div>
  </div>`;
}

function attachImageFallbacks(){
document.querySelectorAll('img[data-imgfallback]').forEach(function(img){
img.onerror = function(){
if (this.dataset.imgfallback === 'hide') this.style.display = 'none';
else this.style.opacity = '0.2';
};
});
}

function render(){
  const app = document.getElementById('app');
  let body = '';
  if (state.tab==='home') body = renderHome();
  else if (state.tab==='rank') body = renderRank();
  else if (state.tab==='chat') body = renderChat();
  else if (state.tab==='quiz') body = renderQuiz();
  else if (state.tab==='gallery') body = renderGallery();
    else if (state.tab==='map') body = renderMap();
  else if (state.tab==='ai') body = renderAI();

  app.innerHTML = `
    ${renderHeader()}
    ${renderTabs()}
    ${body}
    <footer>${esc(t('footerText'))}<br/>GTA6 HUB — 2026<div style="margin-top:10px;display:flex;gap:14px;justify-content:center;"><a href="https://x.com/rockstargames" target="_blank" rel="noopener noreferrer" style="color:var(--text-dim);">X</a><a href="https://instagram.com/rockstargames" target="_blank" rel="noopener noreferrer" style="color:var(--text-dim);">Instagram</a><a href="https://www.youtube.com/rockstargames" target="_blank" rel="noopener noreferrer" style="color:var(--text-dim);">YouTube</a><a href="https://www.facebook.com/rockstargames" target="_blank" rel="noopener noreferrer" style="color:var(--text-dim);">Facebook</a></div><div style="margin-top:8px;font-size:11px;color:var(--text-dim);">${esc(t('maturityBadge'))}</div></footer>
    ${renderAuthModal()}
    ${state.toastMsg ? `<div class="toast">${esc(state.toastMsg)}</div>` : ''}
  `;

  attachEvents();

  const chatBox = document.getElementById('chatBox');
  if (chatBox) chatBox.scrollTop = chatBox.scrollHeight;
  const aiBox = document.getElementById('aiBox');
  if (aiBox) aiBox.scrollTop = aiBox.scrollHeight;
}

function attachEvents(){
attachImageFallbacks();
  document.querySelectorAll('[data-lang]').forEach(b => b.onclick = () => setLang(b.dataset.lang));
    const langSelect = document.getElementById('langSelect'); if (langSelect) langSelect.onchange = () => setLang(langSelect.value); const themeToggle = document.getElementById('themeToggle'); if (themeToggle) themeToggle.onclick = toggleTheme;
  document.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { state.tab = b.dataset.tab; state.quizFinished=false; render();
    if (b.dataset.tab==='rank') loadLeaderboard();
    if (b.dataset.tab==='chat') loadChat();
    if (b.dataset.tab==='gallery') loadGallery();
  });

  const openAuth = document.getElementById('openAuth');
  if (openAuth) openAuth.onclick = () => { state.showAuth = true; state.authMode='login'; state.authError=null; render(); };
  const closeAuth = document.getElementById('closeAuth');
  if (closeAuth) closeAuth.onclick = () => { state.showAuth = false; render(); };
  const overlay = document.getElementById('modalOverlay');
  if (overlay) overlay.onclick = (e) => { if (e.target === overlay){ state.showAuth=false; render(); } };

  document.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { state.authMode = b.dataset.mode; state.authError=null; render(); });

  const authSubmit = document.getElementById('authSubmit');
  if (authSubmit) authSubmit.onclick = () => {
    const emailEl = document.getElementById('authEmail');
    const passwordEl = document.getElementById('authPassword');
    const email = emailEl ? emailEl.value.trim() : '';
    const password = passwordEl ? passwordEl.value : '';
    if (state.authMode === 'register') {
      const usernameEl = document.getElementById('authUsername');
      const countryEl = document.getElementById('authCountry');
      const username = usernameEl ? usernameEl.value.trim() : '';
      const country = countryEl ? countryEl.value.trim().toUpperCase() : undefined;
      doAuth('register', { email, password, username, country });
    } else {
      doAuth('login', { email, password });
    }
  };
  const accountChip = document.getElementById('accountChip');
  if (accountChip) accountChip.onclick = () => { if (confirm(state.lang==='fr'?'Se déconnecter ?':'Log out?')) logout(); };

  const chatInput = document.getElementById('chatInput');
  const chatSendBtn = document.getElementById('chatSendBtn');
  if (chatSendBtn) chatSendBtn.onclick = () => { sendChat(chatInput.value); chatInput.value=''; };
  if (chatInput) chatInput.onkeydown = (e) => { if (e.key==='Enter'){ sendChat(chatInput.value); chatInput.value=''; } };

  const startQuizBtn = document.getElementById('startQuizBtn');
  if (startQuizBtn) startQuizBtn.onclick = () => {
    if (!state.user){ state.showAuth=true; render(); return; }
    startQuiz();
  };
  const restartQuizBtn = document.getElementById('restartQuizBtn');
  if (restartQuizBtn) restartQuizBtn.onclick = restartQuiz; const shareScoreBtn = document.getElementById('shareScoreBtn'); if (shareScoreBtn) shareScoreBtn.onclick = shareScore;
  document.querySelectorAll('[data-idx]').forEach(b => b.onclick = () => answerQuiz(parseInt(b.dataset.idx)));
  const nextQuizBtn = document.getElementById('nextQuizBtn');
  if (nextQuizBtn) nextQuizBtn.onclick = nextQuiz;

  const postGalleryBtn = document.getElementById('postGalleryBtn');
  if (postGalleryBtn) postGalleryBtn.onclick = () => {
    const url = document.getElementById('gImgUrl').value.trim();
    const cat = document.getElementById('gCategory').value;
    const cap = document.getElementById('gCaption').value.trim();
    if (!url){ showToast(state.lang==='fr'?'Ajoute un lien image':'Add an image link'); return; }
    postGallery(url, cat, cap);
  };
  document.querySelectorAll('[data-like]').forEach(b => b.onclick = () => likeGallery(b.dataset.like));
  document.querySelectorAll('[data-report]').forEach(b => b.onclick = () => reportGallery(b.dataset.report));

  const aiInput = document.getElementById('aiInput');
  const aiSendBtn = document.getElementById('aiSendBtn');
  if (aiSendBtn) aiSendBtn.onclick = () => { const v = aiInput.value; aiInput.value=''; sendAI(v); };
  if (aiInput) aiInput.onkeydown = (e) => { if (e.key==='Enter'){ const v = aiInput.value; aiInput.value=''; sendAI(v); } };
}

render();
loadLeaderboard();
loadChat();
loadGallery();
startChatRealtime();
restoreSupabaseSession();
setInterval(() => { if (state.tab==='chat') loadChat(); }, 15000);
setInterval(() => { if (state.tab==='rank') loadLeaderboard(); }, 15000);
  setInterval(updateCountdownDisplay, 1000); document.documentElement.setAttribute('data-theme', state.theme); if (!localStorage.getItem('g6_age_verified')) { showAgeGate(); }
