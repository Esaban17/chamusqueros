// Bolivia — temporada en curso al 2026-10-14 (División Profesional 2026, fecha 21). Investigado el 2026-10-14.
// Orden: de más fuerte a más débil (tabla actual, presupuesto e historia).
// Ascendieron Real Potosí (campeón Copa Simón Bolívar 2025) y ABB (repechaje); descendió Jorge Wilstermann.
// Segunda categoría: Copa Simón Bolívar 2026 (nombre oficial confirmado), fase nacional de 24 clubes en 6 grupos.
import type { CountryTeams } from '../teams';

export default {
  leagues: [
    {
      name: 'División Profesional de Bolivia',
      teams: [
        { name: 'Bolívar', city: 'La Paz', dept: 'La Paz', nickname: 'La Academia', colors: ['#6CACE4', '#FFFFFF'], stadium: 'Estadio Hernando Siles', rival: 'The Strongest' },
        { name: 'Always Ready', city: 'El Alto', dept: 'La Paz', colors: ['#FFFFFF', '#C8102E'], stadium: 'Estadio Municipal de El Alto' },
        { name: 'The Strongest', city: 'La Paz', dept: 'La Paz', nickname: 'El Tigre', colors: ['#FFD100', '#000000'], stadium: 'Estadio Hernando Siles', rival: 'Bolívar' },
        { name: 'Oriente Petrolero', city: 'Santa Cruz de la Sierra', dept: 'Santa Cruz', nickname: 'El Refinero', colors: ['#007A33', '#FFFFFF'], stadium: 'Estadio Ramón Tahuichi Aguilera', rival: 'Blooming' },
        { name: 'Blooming', city: 'Santa Cruz de la Sierra', dept: 'Santa Cruz', nickname: 'La Academia Cruceña', colors: ['#5BC2E7', '#FFFFFF'], stadium: 'Estadio Ramón Tahuichi Aguilera', rival: 'Oriente Petrolero' },
        { name: 'Real Potosí', city: 'Potosí', dept: 'Potosí', nickname: 'El Lila', colors: ['#9B6FB5', '#FFFFFF'], stadium: 'Estadio Víctor Agustín Ugarte', rival: 'Nacional Potosí' },
        { name: 'Aurora', city: 'Cochabamba', dept: 'Cochabamba', nickname: 'El Equipo del Pueblo', colors: ['#5BC2E7', '#FFFFFF'], stadium: 'Estadio Félix Capriles' },
        { name: 'Nacional Potosí', city: 'Potosí', dept: 'Potosí', nickname: 'La Banda Roja', colors: ['#FFFFFF', '#C8102E'], stadium: 'Estadio Víctor Agustín Ugarte', rival: 'Real Potosí' },
        { name: 'Guabirá', city: 'Montero', dept: 'Santa Cruz', nickname: 'El Azucarero', colors: ['#C8102E', '#FFFFFF'], stadium: 'Estadio Gilberto Parada' },
        { name: 'Independiente Petrolero', city: 'Sucre', dept: 'Chuquisaca', nickname: 'El Matador', colors: ['#C8102E', '#FFFFFF'], stadium: 'Estadio Olímpico Patria' },
        { name: 'Real Oruro', city: 'Oruro', dept: 'Oruro', nickname: 'El Rojo Carmesí', colors: ['#990000', '#C9A227'], stadium: 'Estadio Jesús Bermúdez' },
        { name: 'San Antonio Bulo Bulo', city: 'Entre Ríos', dept: 'Cochabamba', nickname: 'El Matagigantes', colors: ['#5BC2E7', '#FFFFFF'], stadium: 'Estadio Carlos Villegas' },
        { name: 'ABB', city: 'El Alto', dept: 'La Paz', colors: ['#FFD100', '#0033A0'], stadium: 'Estadio Municipal de El Alto' },
        // Juega de local temporalmente en el Félix Capriles.
        { name: 'Universitario de Vinto', city: 'Vinto', dept: 'Cochabamba', colors: ['#0033A0', '#FFFFFF'], stadium: 'Estadio Félix Capriles' }, // colores no confirmados
        { name: 'GV San José', city: 'Oruro', dept: 'Oruro', nickname: 'El Santo', colors: ['#5BC2E7', '#FFFFFF'], stadium: 'Estadio Jesús Bermúdez' },
        { name: 'Real Tomayapo', city: 'Tarija', dept: 'Tarija', nickname: 'El Verde', colors: ['#006400', '#FFFFFF'], stadium: 'Estadio IV Centenario' },
      ],
    },
    {
      name: 'Copa Simón Bolívar',
      // 24 clubes de la fase nacional 2026: primero los 16 clasificados a la fase final (octavos en curso), luego los 8 eliminados en grupos.
      // Colores provisionales (no confirmados) para todos los clubes de esta lista.
      teams: [
        { name: 'Empresa Minera Huanuni', city: 'Huanuni', dept: 'Oruro', colors: ['#0033A0', '#FFFFFF'] },
        { name: 'IN San Juan', city: 'Warnes', dept: 'Santa Cruz', colors: ['#007A33', '#FFFFFF'] },
        { name: 'Mineros Potosí', city: 'Potosí', dept: 'Potosí', colors: ['#000000', '#FFD100'] },
        { name: 'Unión Tarija', city: 'Tarija', dept: 'Tarija', colors: ['#C8102E', '#FFFFFF'] },
        { name: 'San Martín', city: 'Yacuiba', dept: 'Tarija', colors: ['#0033A0', '#FFD100'] },
        { name: 'FATIC', city: 'El Alto', dept: 'La Paz', colors: ['#C8102E', '#0033A0'] },
        { name: 'Virginia', city: 'Santa Cruz de la Sierra', dept: 'Santa Cruz', colors: ['#5BC2E7', '#FFFFFF'] },
        { name: 'Primero de Mayo', city: 'Trinidad', dept: 'Beni', colors: ['#C8102E', '#FFFFFF'] },
        { name: 'Atlético Independiente', city: 'Cochabamba', dept: 'Cochabamba', colors: ['#C8102E', '#000000'] },
        { name: '26 de Febrero', city: 'Colquiri', dept: 'La Paz', colors: ['#007A33', '#FFFFFF'] },
        { name: 'Deportivo Tigres', city: 'Cochabamba', dept: 'Cochabamba', colors: ['#FFD100', '#000000'] },
        { name: 'Ciudad NSC Academia', city: 'Warnes', dept: 'Santa Cruz', colors: ['#0033A0', '#FFFFFF'] },
        { name: 'Chaco FC', city: 'Cobija', dept: 'Pando', colors: ['#007A33', '#FFD100'] },
        { name: 'Tiquipaya', city: 'Tiquipaya', dept: 'Cochabamba', colors: ['#FFFFFF', '#007A33'] },
        { name: '10 de Noviembre', city: 'Potosí', dept: 'Potosí', colors: ['#FFFFFF', '#0033A0'] },
        { name: 'Atlético Sucre', city: 'Sucre', dept: 'Chuquisaca', colors: ['#C8102E', '#FFFFFF'] },
        { name: 'Universitario de Sucre', city: 'Sucre', dept: 'Chuquisaca', colors: ['#FFFFFF', '#C8102E'] },
        { name: 'Universitario del Beni', city: 'Trinidad', dept: 'Beni', colors: ['#0033A0', '#FFFFFF'] },
        { name: 'Universitario de Tarija', city: 'Tarija', dept: 'Tarija', colors: ['#FFFFFF', '#0033A0'] },
        { name: 'Hiska Nacional', city: 'La Paz', dept: 'La Paz', colors: ['#C8102E', '#FFD100'] },
        { name: 'Ingenieros', city: 'Oruro', dept: 'Oruro', colors: ['#7B1E2B', '#FFFFFF'] },
        { name: 'Libertad', city: 'Cobija', dept: 'Pando', colors: ['#FFFFFF', '#000000'] },
        { name: 'Atlético Juniors', city: 'Yotala', dept: 'Chuquisaca', colors: ['#F47920', '#000000'] },
        { name: 'Guadalajara', city: 'Challapata', dept: 'Oruro', colors: ['#C8102E', '#FFFFFF'] },
      ],
    },
  ],
  sources: [
    'https://en.wikipedia.org/wiki/2026_FBF_Divisi%C3%B3n_Profesional',
    'https://fbf.com.bo/torneos/division-profesional/',
    'https://es.wikipedia.org/wiki/Copa_Sim%C3%B3n_Bol%C3%ADvar_2026_(Bolivia)',
    'https://correodelsur.com/deporte/20261011/atletico-sucre-sale-a-marcar-territorio.html',
    'https://es.wikipedia.org/wiki/Club_Atlético_Nacional_Potosí',
    'https://es.wikipedia.org/wiki/Club_Real_Potosí',
    'https://es.wikipedia.org/wiki/Club_Deportivo_Real_Tomayapo',
    'https://es.wikipedia.org/wiki/Club_Deportivo_San_Antonio_Bulo_Bulo',
    'https://es.wikipedia.org/wiki/Club_Independiente_Petrolero',
    'https://es.wikipedia.org/wiki/Academia_del_Balompié_Boliviano',
    'https://es.wikipedia.org/wiki/Club_Deportivo_Totora_Real_Oruro',
  ],
} satisfies CountryTeams;
