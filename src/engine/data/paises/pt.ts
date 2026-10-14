// Portugal — temporada 2026-27 en curso al 2026-10-14. Investigado el 2026-10-14.
// Orden: de más fuerte a más débil (tabla actual, presupuesto e historia).
// Ascendieron Marítimo y Académico de Viseu; descendieron AVS y Tondela.
// A la Liga Portugal 2 subieron Amarante y Académica.
import type { CountryTeams } from '../teams';

export default {
  leagues: [
    {
      name: 'Liga Portugal',
      teams: [
        { name: 'Oporto', city: 'Oporto', dept: 'Oporto', nickname: 'Los Dragones', colors: ['#003893', '#FFFFFF'], stadium: 'Estádio do Dragão', rival: 'Benfica' },
        { name: 'Benfica', city: 'Lisboa', dept: 'Lisboa', nickname: 'Las Águilas', colors: ['#E83030', '#FFFFFF'], stadium: 'Estádio da Luz', rival: 'Sporting de Lisboa' },
        { name: 'Sporting de Lisboa', city: 'Lisboa', dept: 'Lisboa', nickname: 'Los Leones', colors: ['#008057', '#FFFFFF'], stadium: 'José Alvalade', rival: 'Benfica' },
        { name: 'Braga', city: 'Braga', dept: 'Braga', nickname: 'Los Arsenalistas', colors: ['#E30613', '#FFFFFF'], stadium: 'Estádio Municipal de Braga', rival: 'Vitória de Guimarães' },
        { name: 'Vitória de Guimarães', city: 'Guimarães', dept: 'Braga', nickname: 'Los Conquistadores', colors: ['#FFFFFF', '#000000'], stadium: 'D. Afonso Henriques', rival: 'Braga' },
        { name: 'Santa Clara', city: 'Ponta Delgada', dept: 'Azores', colors: ['#E30613', '#FFFFFF'], stadium: 'Estádio de São Miguel' },
        { name: 'Famalicão', city: 'Vila Nova de Famalicão', dept: 'Braga', colors: ['#FFFFFF', '#003399'], stadium: 'Municipal de Famalicão' },
        { name: 'Gil Vicente', city: 'Barcelos', dept: 'Braga', nickname: 'Los Gallos', colors: ['#1F3E8C', '#D50032'], stadium: 'Cidade de Barcelos' },
        { name: 'Arouca', city: 'Arouca', dept: 'Aveiro', colors: ['#FFD100', '#0055A4'], stadium: 'Municipal de Arouca' },
        { name: 'Moreirense', city: 'Moreira de Cónegos', dept: 'Braga', colors: ['#007A33', '#FFFFFF'], stadium: 'Comendador Joaquim de Almeida Freitas' },
        { name: 'Académico de Viseu', city: 'Viseu', dept: 'Viseu', colors: ['#000000', '#FFFFFF'], stadium: 'Estádio do Fontelo' },
        { name: 'Estoril', city: 'Estoril', dept: 'Lisboa', nickname: 'Los Canarios', colors: ['#FFD100', '#0055A4'], stadium: 'António Coimbra da Mota' },
        { name: 'Rio Ave', city: 'Vila do Conde', dept: 'Oporto', colors: ['#007A33', '#FFFFFF'], stadium: 'Estádio dos Arcos' },
        { name: 'Marítimo', city: 'Funchal', dept: 'Madeira', nickname: 'Los Leones de la Isla', colors: ['#007A33', '#C8102E'], stadium: 'Estádio do Marítimo', rival: 'Nacional' },
        { name: 'Alverca', city: 'Alverca do Ribatejo', dept: 'Lisboa', colors: ['#0055A4', '#C8102E'], stadium: 'Complexo Desportivo FC Alverca' }, // colores no confirmados
        { name: 'Estrela da Amadora', city: 'Amadora', dept: 'Lisboa', colors: ['#C8102E', '#007A33'], stadium: 'José Gomes' },
        { name: 'Casa Pia', city: 'Lisboa', dept: 'Lisboa', colors: ['#000000', '#FFFFFF'], stadium: 'Estádio Municipal de Rio Maior' },
        { name: 'Nacional', city: 'Funchal', dept: 'Madeira', colors: ['#000000', '#FFFFFF'], stadium: 'Estádio da Madeira', rival: 'Marítimo' },
      ],
    },
    {
      name: 'Liga Portugal 2',
      teams: [
        { name: 'Tondela', city: 'Tondela', dept: 'Viseu', nickname: 'Los Auriverdes', colors: ['#FFD100', '#007A33'], stadium: 'João Cardoso' },
        { name: 'AVS', city: 'Vila das Aves', dept: 'Oporto', colors: ['#C8102E', '#FFFFFF'], stadium: 'Estádio do CD das Aves' }, // colores no confirmados
        { name: 'Farense', city: 'Faro', dept: 'Faro', nickname: 'Los Leones de Faro', colors: ['#FFFFFF', '#000000'], stadium: 'São Luís', rival: 'Portimonense' },
        { name: 'Lusitânia Lourosa', city: 'Lourosa', dept: 'Aveiro', colors: ['#0055A4', '#FFFFFF'], stadium: 'Estádio do Lusitânia de Lourosa' }, // colores no confirmados
        { name: 'Vizela', city: 'Vizela', dept: 'Braga', colors: ['#0055A4', '#FFFFFF'], stadium: 'Estádio do FC Vizela' },
        { name: 'Académica', city: 'Coímbra', dept: 'Coímbra', nickname: 'Los Estudiantes', colors: ['#000000', '#FFFFFF'], stadium: 'Cidade de Coimbra' },
        { name: 'Benfica B', city: 'Seixal', dept: 'Setúbal', colors: ['#E83030', '#FFFFFF'], stadium: 'Benfica Campus' },
        { name: 'Sporting de Lisboa B', city: 'Alcochete', dept: 'Setúbal', colors: ['#008057', '#FFFFFF'], stadium: 'Estádio Aurélio Pereira' },
        { name: 'Penafiel', city: 'Penafiel', dept: 'Oporto', colors: ['#C8102E', '#000000'], stadium: 'Municipal 25 de Abril' },
        { name: 'União de Leiria', city: 'Leiria', dept: 'Leiria', colors: ['#C8102E', '#000000'], stadium: 'Magalhães Pessoa' }, // colores no confirmados
        { name: 'Portimonense', city: 'Portimão', dept: 'Faro', colors: ['#000000', '#FFFFFF'], stadium: 'Municipal de Portimão', rival: 'Farense' },
        { name: 'Chaves', city: 'Chaves', dept: 'Vila Real', colors: ['#C8102E', '#0055A4'], stadium: 'Eng.º Manuel Branco Teixeira' },
        { name: 'Leixões', city: 'Matosinhos', dept: 'Oporto', colors: ['#C8102E', '#FFFFFF'], stadium: 'Estádio do Mar' },
        { name: 'Torreense', city: 'Torres Vedras', dept: 'Lisboa', colors: ['#0055A4', '#FFFFFF'], stadium: 'Manuel Marques' }, // colores no confirmados
        { name: 'Oporto B', city: 'Vila Nova de Gaia', dept: 'Oporto', colors: ['#003893', '#FFFFFF'], stadium: 'Luís Filipe Menezes' },
        { name: 'Feirense', city: 'Santa Maria da Feira', dept: 'Aveiro', colors: ['#0055A4', '#FFFFFF'], stadium: 'Marcolino de Castro' },
        { name: 'Felgueiras', city: 'Felgueiras', dept: 'Oporto', colors: ['#C8102E', '#0055A4'], stadium: 'Dr. Machado de Matos' }, // colores no confirmados
        { name: 'Amarante', city: 'Amarante', dept: 'Oporto', colors: ['#FFFFFF', '#000000'], stadium: 'Municipal de Amarante' }, // colores no confirmados
      ],
    },
  ],
  sources: [
    'https://en.wikipedia.org/wiki/2026%E2%80%9327_Primeira_Liga',
    'https://en.wikipedia.org/wiki/2026%E2%80%9327_Liga_Portugal_2',
    'https://en.wikipedia.org/wiki/2025%E2%80%9326_Liga_Portugal_2',
    'https://www.abola.pt/noticias/gil-vicente-poe-a-venda-bilhetes-para-o-jogo-com-o-fc-porto-e-apresenta-se-de-vermelho-e-branco-2026071716093972442',
  ],
} satisfies CountryTeams;
