// Brasil — temporada 2026 (Série A, fecha 30; Série B, fecha 33). Investigado el 2026-10-14.
// Orden: de más fuerte a más débil (tabla actual, presupuesto e historia).
// Ascendieron Coritiba, Athletico Paranaense, Chapecoense y Remo; descendieron Sport, Juventude, Fortaleza y Ceará (2025).
import type { CountryTeams } from '../teams';

export default {
  leagues: [
    {
      name: 'Brasileirão Série A',
      teams: [
        { name: 'Flamengo', city: 'Río de Janeiro', dept: 'Río de Janeiro', nickname: 'Mengão', colors: ['#C8102E', '#000000'], stadium: 'Maracaná', rival: 'Fluminense' },
        { name: 'Palmeiras', city: 'São Paulo', dept: 'São Paulo', nickname: 'Verdão', colors: ['#006437', '#FFFFFF'], stadium: 'Nubank Parque', rival: 'Corinthians' },
        { name: 'Fluminense', city: 'Río de Janeiro', dept: 'Río de Janeiro', nickname: 'Flu', colors: ['#7A0026', '#006341'], stadium: 'Maracaná', rival: 'Flamengo' },
        { name: 'Athletico Paranaense', city: 'Curitiba', dept: 'Paraná', nickname: 'Furacão', colors: ['#C8102E', '#000000'], stadium: 'Arena da Baixada', rival: 'Coritiba' },
        { name: 'Cruzeiro', city: 'Belo Horizonte', dept: 'Minas Gerais', nickname: 'La Raposa', colors: ['#0033A0', '#FFFFFF'], stadium: 'Mineirão', rival: 'Atlético Mineiro' },
        { name: 'Bahia', city: 'Salvador', dept: 'Bahía', nickname: 'Tricolor de Aço', colors: ['#FFFFFF', '#0033A0'], stadium: 'Arena Fonte Nova', rival: 'Vitória' },
        { name: 'Atlético Mineiro', city: 'Belo Horizonte', dept: 'Minas Gerais', nickname: 'Galo', colors: ['#000000', '#FFFFFF'], stadium: 'Arena MRV', rival: 'Cruzeiro' },
        { name: 'Botafogo', city: 'Río de Janeiro', dept: 'Río de Janeiro', nickname: 'Fogão', colors: ['#000000', '#FFFFFF'], stadium: 'Estadio Nilton Santos' },
        { name: 'São Paulo', city: 'São Paulo', dept: 'São Paulo', nickname: 'Tricolor Paulista', colors: ['#FFFFFF', '#E30613'], stadium: 'Morumbis' },
        { name: 'Corinthians', city: 'São Paulo', dept: 'São Paulo', nickname: 'Timão', colors: ['#FFFFFF', '#000000'], stadium: 'Neo Química Arena', rival: 'Palmeiras' },
        { name: 'Santos', city: 'Santos', dept: 'São Paulo', nickname: 'Peixe', colors: ['#FFFFFF', '#000000'], stadium: 'Vila Belmiro' },
        { name: 'Internacional', city: 'Porto Alegre', dept: 'Río Grande del Sur', nickname: 'Colorado', colors: ['#E30613', '#FFFFFF'], stadium: 'Beira-Rio', rival: 'Grêmio' },
        { name: 'Grêmio', city: 'Porto Alegre', dept: 'Río Grande del Sur', nickname: 'Tricolor Gaúcho', colors: ['#0D80BF', '#000000'], stadium: 'Arena do Grêmio', rival: 'Internacional' },
        { name: 'Red Bull Bragantino', city: 'Bragança Paulista', dept: 'São Paulo', nickname: 'Massa Bruta', colors: ['#FFFFFF', '#E30613'], stadium: 'Estadio Cícero de Souza Marques' },
        { name: 'Vasco da Gama', city: 'Río de Janeiro', dept: 'Río de Janeiro', nickname: 'Gigante da Colina', colors: ['#000000', '#FFFFFF'], stadium: 'São Januário', rival: 'Flamengo' },
        { name: 'Coritiba', city: 'Curitiba', dept: 'Paraná', nickname: 'Coxa', colors: ['#00544D', '#FFFFFF'], stadium: 'Estadio Couto Pereira', rival: 'Athletico Paranaense' },
        { name: 'Vitória', city: 'Salvador', dept: 'Bahía', nickname: 'Leão da Barra', colors: ['#E30613', '#000000'], stadium: 'Barradão', rival: 'Bahia' },
        { name: 'Mirassol', city: 'Mirassol', dept: 'São Paulo', nickname: 'Leão', colors: ['#FFD100', '#009A44'], stadium: 'Estadio José Maria de Campos Maia' },
        { name: 'Remo', city: 'Belém', dept: 'Pará', nickname: 'Leão Azul', colors: ['#002F6C', '#FFFFFF'], stadium: 'Mangueirão' },
        { name: 'Chapecoense', city: 'Chapecó', dept: 'Santa Catarina', nickname: 'Chape', colors: ['#009A44', '#FFFFFF'], stadium: 'Arena Condá' },
      ],
    },
    {
      name: 'Brasileirão Série B',
      teams: [
        { name: 'Fortaleza', city: 'Fortaleza', dept: 'Ceará', nickname: 'Leão do Pici', colors: ['#0033A0', '#E30613'], stadium: 'Arena Castelão', rival: 'Ceará' },
        { name: 'Vila Nova', city: 'Goiânia', dept: 'Goiás', nickname: 'Tigre', colors: ['#E30613', '#FFFFFF'], stadium: 'Estadio Onésio Brasileiro Alvarenga', rival: 'Goiás' },
        { name: 'Novorizontino', city: 'Novo Horizonte', dept: 'São Paulo', nickname: 'Tigre do Vale', colors: ['#FFD100', '#000000'], stadium: 'Estadio Jorge Ismael de Biasi' },
        { name: 'Juventude', city: 'Caxias do Sul', dept: 'Río Grande del Sur', nickname: 'Papo', colors: ['#009A44', '#FFFFFF'], stadium: 'Estadio Alfredo Jaconi' },
        { name: 'Criciúma', city: 'Criciúma', dept: 'Santa Catarina', nickname: 'Tigre', colors: ['#FFD100', '#000000'], stadium: 'Estadio Heriberto Hülse' },
        { name: 'Sport Recife', city: 'Recife', dept: 'Pernambuco', nickname: 'Leão da Ilha', colors: ['#E30613', '#000000'], stadium: 'Ilha do Retiro', rival: 'Náutico' },
        { name: 'Atlético Goianiense', city: 'Goiânia', dept: 'Goiás', nickname: 'Dragão', colors: ['#E30613', '#000000'], stadium: 'Estadio Antônio Accioly' },
        { name: 'Ceará', city: 'Fortaleza', dept: 'Ceará', nickname: 'Vovô', colors: ['#000000', '#FFFFFF'], stadium: 'Arena Castelão', rival: 'Fortaleza' },
        { name: 'CRB', city: 'Maceió', dept: 'Alagoas', nickname: 'Galo da Praia', colors: ['#E30613', '#FFFFFF'], stadium: 'Estadio Rei Pelé' },
        { name: 'Goiás', city: 'Goiânia', dept: 'Goiás', nickname: 'Esmeraldino', colors: ['#009A44', '#FFFFFF'], stadium: 'Estadio da Serrinha', rival: 'Vila Nova' },
        { name: 'Cuiabá', city: 'Cuiabá', dept: 'Mato Grosso', nickname: 'Dourado', colors: ['#FFD100', '#009A44'], stadium: 'Arena Pantanal' },
        { name: 'Operário Ferroviário', city: 'Ponta Grossa', dept: 'Paraná', nickname: 'Fantasma', colors: ['#000000', '#FFFFFF'], stadium: 'Estadio Germano Krüger' },
        { name: 'São Bernardo', city: 'São Bernardo do Campo', dept: 'São Paulo', nickname: 'Bernô', colors: ['#FFD100', '#000000'], stadium: 'Estadio 1º de Maio' },
        { name: 'Náutico', city: 'Recife', dept: 'Pernambuco', nickname: 'Timbu', colors: ['#E30613', '#FFFFFF'], stadium: 'Estadio dos Aflitos', rival: 'Sport Recife' },
        { name: 'Athletic Club', city: 'São João del-Rei', dept: 'Minas Gerais', nickname: 'Esquadrão de Aço', colors: ['#000000', '#FFFFFF'], stadium: 'Arena Sicredi' },
        { name: 'Botafogo-SP', city: 'Ribeirão Preto', dept: 'São Paulo', nickname: 'Pantera', colors: ['#E30613', '#FFFFFF'], stadium: 'Estadio Santa Cruz' },
        { name: 'Avaí', city: 'Florianópolis', dept: 'Santa Catarina', nickname: 'Leão da Ilha', colors: ['#0055A4', '#FFFFFF'], stadium: 'Estadio da Ressacada' },
        { name: 'América Mineiro', city: 'Belo Horizonte', dept: 'Minas Gerais', nickname: 'Coelho', colors: ['#009A44', '#000000'], stadium: 'Estadio Independência' },
        { name: 'Londrina', city: 'Londrina', dept: 'Paraná', nickname: 'Tubarão', colors: ['#6CACE4', '#FFFFFF'] },
        { name: 'Ponte Preta', city: 'Campinas', dept: 'São Paulo', nickname: 'Macaca', colors: ['#FFFFFF', '#000000'], stadium: 'Estadio Moisés Lucarelli' },
      ],
    },
  ],
  sources: [
    'https://pt.wikipedia.org/wiki/Campeonato_Brasileiro_de_Futebol_de_2026_-_Série_A',
    'https://pt.wikipedia.org/wiki/Campeonato_Brasileiro_de_Futebol_de_2026_-_Série_B',
  ],
} satisfies CountryTeams;
