// CRÉDITOS — edita este archivo para añadir autores (se muestran en
// ⚙ Ajustes → Créditos). Los títulos de sección se traducen solos.
//
// Música: una entrada por pista que uses desde audio/musica/.
//   track: 'menu' | 'playa' | 'centro' | 'industrial' | 'mansiones' | 'puerto' | 'aurelio' | 'vera' | 'bruno'
//   title, author, license (p. ej. 'CC BY 4.0'), url (opcional, enlace a la obra o licencia)
// Las pistas sin entrada aparecen como "generada por código".

export const CREDITS = {
  music: [
    // { track: 'playa', title: 'Sunny Heist', author: 'Nombre Apellido', license: 'CC BY 4.0', url: 'https://…' },
    // Menú (audio/musica/serenata_mexicana.mp3): completa autor y licencia si la pista lo pide, p. ej.
    // { track: 'menu', title: 'Serenata mexicana', author: 'Nombre del autor', license: 'CC BY 4.0', url: 'https://…' },
  ],
  // Voces grabadas (audio/voces/), si las hay
  voices: [
    // { character: 'Aurelio', author: 'Nombre del actor/actriz', license: 'Cedida' },
  ],
  // Otros recursos con atribución
  other: [
    { what: 'Bungee', author: 'David Jonathan Ross', license: 'SIL Open Font License 1.1', url: 'https://fonts.google.com/specimen/Bungee' },
    { what: 'Rubik', author: 'Hubert & Fischer', license: 'SIL Open Font License 1.1', url: 'https://fonts.google.com/specimen/Rubik' },
  ],
};
