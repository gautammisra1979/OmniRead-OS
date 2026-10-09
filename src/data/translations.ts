export type Locale = "en" | "es" | "fr";

export const translations: Record<string, Record<string, string>> = {
  en: {
    "nav.bestsellers": "Bestsellers",
    "nav.recommended": "Recommended",
    "nav.latest": "Latest",
    "nav.comingSoon": "Coming Soon",
    "nav.books": "Books",
    "nav.audio": "Audio",
    "nav.video": "Video",
    "nav.myLibrary": "My Library",
    "nav.concierge": "Concierge",
    "nav.challenge": "The Challenge",
    "nav.librarian": "Librarian",
    "nav.joinMembership": "Join Membership",
    "nav.signIn": "Sign in",
    "nav.settings": "Settings",
    "nav.searchPlaceholder": "Search by title, author, or genre...",
    
    "hero.slide1.title": "Your Vision, Published & Delivered.",
    "hero.slide1.desc": "A premium white-label platform for authors, creators, and publishers. Launch a beautiful storefront for your e-books, audiobooks, and video courses—fully branded to you, built in minutes.",
    "hero.slide1.btn": "Browse Products",
    "hero.slide1.secondaryBtn": "Watch Demo",
    
    "hero.slide2.title": "Unlock the Interactive AI Librarian",
    "hero.slide2.desc": "Empower your readers to chat directly with your books, audiobooks, and courses. Answer deep questions, generate study guides, and analyze themes in real-time with your custom AI reading companion.",
    "hero.slide2.btn": "Subscribe to access the Librarian",
    
    "hero.slide3.title": "Host Immersive Reading Challenges",
    "hero.slide3.desc": "Gamify your catalog! Launch 30-day guided reading challenges, track customer progress, reward milestones, and build a thriving, highly engaged community around your publications.",
    "hero.slide3.btn": "Join Current Challenge",

    "quickHover.preview": "Quick Preview",
    "quickHover.addCart": "Add to Cart",
    "quickHover.details": "View Details",

    "catalog.statusLive": "Live",
    "catalog.statusComingSoon": "Coming Soon",
    "catalog.statusRetired": "Retired",
    "catalog.statusLabel": "Status",

    "product.buyNow": "Buy Now",
    "product.buyNowError": "Checkout failed. Please try again.",

    "media.noMedia": "Sample preview — upload your media to replace this placeholder.",

    "email.magicLink.subject": "Your sign-in link for {store}",
    "email.magicLink.heading": "Sign in to {store}",
    "email.magicLink.body": "Click the button below to sign in. This link works once and expires in {minutes} minutes.",
    "email.magicLink.button": "Sign in",
    "email.magicLink.fallback": "If the button does not work, copy and paste this link into your browser:",
    "email.magicLink.ignore": "If you did not ask to sign in, you can ignore this email. Your account is safe.",
    "email.test.subject": "Test email from {store}",
    "email.test.heading": "Test email",
    "email.test.body": "This is a test email from {store}. If you are reading it, your transactional email provider ({provider}) is configured correctly.",

    "auth.magicLink.title": "Finish signing in",
    "auth.magicLink.button": "Sign in",
    "auth.magicLink.invalid": "This sign-in link has expired or has already been used. Request a new one."
  },
  fr: {
    "nav.bestsellers": "Meilleures Ventes",
    "nav.recommended": "Recommandé",
    "nav.latest": "Nouveautés",
    "nav.comingSoon": "À Paraître",
    "nav.books": "Livres",
    "nav.audio": "Audio",
    "nav.video": "Vidéo",
    "nav.myLibrary": "Ma Bibliothèque",
    "nav.concierge": "Concierge",
    "nav.challenge": "Le Défi",
    "nav.librarian": "Bibliothécaire",
    "nav.joinMembership": "Devenir Membre",
    "nav.signIn": "Se connecter",
    "nav.settings": "Paramètres",
    "nav.searchPlaceholder": "Rechercher par titre, auteur ou genre...",
    
    "hero.slide1.title": "Votre Vision, Publiée et Livrée.",
    "hero.slide1.desc": "Une plateforme d'édition en marque blanche haut de gamme pour les auteurs, créateurs et éditeurs. Lancez une magnifique vitrine pour vos e-books, livres audio et cours vidéo en quelques minutes.",
    "hero.slide1.btn": "Parcourir les produits",
    "hero.slide1.secondaryBtn": "Voir la démo",
    
    "hero.slide2.title": "Débloquez le Bibliothécaire IA Interactif",
    "hero.slide2.desc": "Permettez à vos lecteurs de discuter directement avec vos livres, livres audio et cours. Répondez aux questions complexes, générez des guides d'étude et analysez les thèmes en temps réel.",
    "hero.slide2.btn": "S'abonner pour accéder au Bibliothécaire",
    
    "hero.slide3.title": "Organisez des Défis de Lecture Immersifs",
    "hero.slide3.desc": "Gamifiez votre catalogue ! Lancez des défis de lecture guidés de 30 jours, suivez les progrès des clients, récompensez les étapes clés et créez une communauté engagée autour de vos œuvres.",
    "hero.slide3.btn": "Rejoindre le défi actuel",

    "quickHover.preview": "Aperçu Rapide",
    "quickHover.addCart": "Ajouter au Panier",
    "quickHover.details": "Voir Détails",

    "catalog.statusLive": "Actif",
    "catalog.statusComingSoon": "Prochainement",
    "catalog.statusRetired": "Retiré",
    "catalog.statusLabel": "Statut",

    "product.buyNow": "Acheter maintenant",
    "product.buyNowError": "Échec du paiement. Veuillez réessayer.",

    "email.magicLink.subject": "Votre lien de connexion pour {store}",
    "email.magicLink.heading": "Connectez-vous à {store}",
    "email.magicLink.body": "Cliquez sur le bouton ci-dessous pour vous connecter. Ce lien ne fonctionne qu'une seule fois et expire dans {minutes} minutes.",
    "email.magicLink.button": "Se connecter",
    "email.magicLink.fallback": "Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :",
    "email.magicLink.ignore": "Si vous n'avez pas demandé à vous connecter, vous pouvez ignorer cet e-mail. Votre compte est en sécurité.",
    "auth.magicLink.title": "Terminer la connexion",
    "auth.magicLink.button": "Se connecter",
    "auth.magicLink.invalid": "Ce lien de connexion a expiré ou a déjà été utilisé. Demandez-en un nouveau.",
    "email.test.subject": "E-mail de test de {store}",
    "email.test.heading": "E-mail de test",
    "email.test.body": "Ceci est un e-mail de test envoyé par {store}. Si vous le lisez, votre fournisseur d'e-mails transactionnels ({provider}) est correctement configuré."
  },
  es: {
    "nav.bestsellers": "Los Más Vendidos",
    "nav.recommended": "Recomendado",
    "nav.latest": "Novedades",
    "nav.comingSoon": "Próximamente",
    "nav.books": "Libros",
    "nav.audio": "Audio",
    "nav.video": "Video",
    "nav.myLibrary": "Mi Biblioteca",
    "nav.concierge": "Conserje",
    "nav.challenge": "El Desafío",
    "nav.librarian": "Bibliotecario",
    "nav.joinMembership": "Unirse a la Membresía",
    "nav.signIn": "Iniciar sesión",
    "nav.settings": "Ajustes",
    "nav.searchPlaceholder": "Buscar por título, autor o género...",
    
    "hero.slide1.title": "Su Visión, Publicada y Entregada.",
    "hero.slide1.desc": "Una plataforma de marca blanca premium para autores, creadores y editores. Lance una hermosa tienda para sus libros electrónicos, audiolibros y cursos de video en minutos.",
    "hero.slide1.btn": "Explorar Productos",
    "hero.slide1.secondaryBtn": "Ver Demostración",
    
    "hero.slide2.title": "Desbloquee el Bibliotecario IA Interactivo",
    "hero.slide2.desc": "Permita que sus lectores chateen directamente con sus libros, audiolibros y cursos. Responda preguntas profundas, genere guías de estudio y analice temas en tiempo real.",
    "hero.slide2.btn": "Suscribirse para acceder al Bibliotecario",
    
    "hero.slide3.title": "Organice Desafíos de Lectura Inmersivos",
    "hero.slide3.desc": "¡Gamifique su catálogo! Lance desafíos de lectura guiados de 30 días, realice un seguimiento del progreso, recompense los logros y construya una comunidad activa.",
    "hero.slide3.btn": "Unirse al Desafío Actual",

    "quickHover.preview": "Vista Rápida",
    "quickHover.addCart": "Añadir al Carrito",
    "quickHover.details": "Ver Detalles",

    "catalog.statusLive": "Activo",
    "catalog.statusComingSoon": "Próximamente",
    "catalog.statusRetired": "Retirado",
    "catalog.statusLabel": "Estado",

    "product.buyNow": "Comprar ahora",
    "product.buyNowError": "Error en el pago. Inténtalo de nuevo.",

    "email.magicLink.subject": "Tu enlace de inicio de sesión para {store}",
    "email.magicLink.heading": "Inicia sesión en {store}",
    "email.magicLink.body": "Haz clic en el botón de abajo para iniciar sesión. Este enlace solo funciona una vez y caduca en {minutes} minutos.",
    "email.magicLink.button": "Iniciar sesión",
    "email.magicLink.fallback": "Si el botón no funciona, copia y pega este enlace en tu navegador:",
    "email.magicLink.ignore": "Si no solicitaste iniciar sesión, puedes ignorar este correo. Tu cuenta está segura.",
    "auth.magicLink.title": "Termina de iniciar sesión",
    "auth.magicLink.button": "Iniciar sesión",
    "auth.magicLink.invalid": "Este enlace de inicio de sesión ha caducado o ya se ha usado. Solicita uno nuevo.",
    "email.test.subject": "Correo de prueba de {store}",
    "email.test.heading": "Correo de prueba",
    "email.test.body": "Este es un correo de prueba de {store}. Si lo estás leyendo, tu proveedor de correo transaccional ({provider}) está configurado correctamente."
  }
};
