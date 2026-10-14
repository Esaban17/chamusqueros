// Japón — temporada en curso al 2026-10-14 (J.League 2026-27, primera con calendario otoño-primavera;
// arrancó el 8 de agosto de 2026 tras la J1 Hyakunen Kōsō League de transición, feb-jun 2026). Investigado el 2026-10-14.
// J1: ascendieron Mito HollyHock (campeón J2 2025), V-Varen Nagasaki y JEF United Chiba (play-off);
// descendieron Yokohama FC, Shonan Bellmare y Albirex Niigata. J2: subieron de J3 Tochigi City, Vanraure Hachinohe y Tegevajaro Miyazaki.
// Orden: de más fuerte a más débil (tabla actual, presupuesto e historia).
import type { CountryTeams } from '../teams';

export default {
  leagues: [
    {
      name: 'J1 League',
      teams: [
        { name: 'Vissel Kobe', city: 'Kobe', dept: 'Hyogo', colors: ['#A6192E', '#000000'], stadium: 'Noevir Stadium Kobe' },
        { name: 'Kashima Antlers', city: 'Kashima', dept: 'Ibaraki', colors: ['#B5121B', '#0B1F3F'], stadium: 'Mercari Stadium' },
        { name: 'Kashiwa Reysol', city: 'Kashiwa', dept: 'Chiba', colors: ['#FFE600', '#000000'], stadium: 'Sankyo Frontier Kashiwa Stadium' },
        { name: 'Sanfrecce Hiroshima', city: 'Hiroshima', dept: 'Hiroshima', colors: ['#4B2C83', '#FFFFFF'], stadium: 'Edion Peace Wing Hiroshima' },
        { name: 'Machida Zelvia', city: 'Machida', dept: 'Tokio', colors: ['#0D2D6C', '#FFFFFF'], stadium: 'Machida GION Stadium' },
        { name: 'Urawa Red Diamonds', city: 'Saitama', dept: 'Saitama', colors: ['#E60012', '#FFFFFF'], stadium: 'Saitama Stadium 2002' },
        { name: 'Kawasaki Frontale', city: 'Kawasaki', dept: 'Kanagawa', colors: ['#1E90D6', '#000000'], stadium: 'Uvance Todoroki Stadium by Fujitsu', rival: 'Yokohama F. Marinos' },
        { name: 'FC Tokyo', city: 'Tokio', dept: 'Tokio', colors: ['#0B2A6F', '#E60012'], stadium: 'Ajinomoto Stadium', rival: 'Tokyo Verdy' },
        { name: 'Yokohama F. Marinos', city: 'Yokohama', dept: 'Kanagawa', colors: ['#0033A0', '#FFFFFF'], stadium: 'Nissan Stadium', rival: 'Kawasaki Frontale' },
        { name: 'Kyoto Sanga', city: 'Kioto', dept: 'Kioto', colors: ['#5B2C83', '#FFFFFF'], stadium: 'Sanga Stadium by Kyocera' },
        { name: 'Gamba Osaka', city: 'Suita', dept: 'Osaka', colors: ['#0A3D91', '#000000'], stadium: 'Panasonic Stadium Suita', rival: 'Cerezo Osaka' },
        { name: 'Nagoya Grampus', city: 'Nagoya', dept: 'Aichi', colors: ['#D7000F', '#F5A300'], stadium: 'Toyota Stadium' },
        { name: 'Cerezo Osaka', city: 'Osaka', dept: 'Osaka', colors: ['#E4007F', '#0B1F4B'], stadium: 'Yodoko Sakura Stadium', rival: 'Gamba Osaka' },
        { name: 'Fagiano Okayama', city: 'Okayama', dept: 'Okayama', colors: ['#A6192E', '#0B1F4B'], stadium: 'JFE Harenokuni Stadium' },
        { name: 'Shimizu S-Pulse', city: 'Shizuoka', dept: 'Shizuoka', colors: ['#F39800', '#003087'], stadium: 'IAI Stadium Nihondaira' },
        { name: 'Avispa Fukuoka', city: 'Fukuoka', dept: 'Fukuoka', colors: ['#0B2A6F', '#C0C0C0'], stadium: 'Best Denki Stadium' },
        { name: 'Tokyo Verdy', city: 'Tokio', dept: 'Tokio', colors: ['#007A33', '#FFFFFF'], stadium: 'Ajinomoto Stadium', rival: 'FC Tokyo' },
        { name: 'V-Varen Nagasaki', city: 'Nagasaki', dept: 'Nagasaki', colors: ['#0047AB', '#F39800'], stadium: 'Peace Stadium Connected by SoftBank' },
        { name: 'Mito HollyHock', city: 'Mito', dept: 'Ibaraki', colors: ['#0B2A6F', '#FFFFFF'], stadium: 'Mito Shinkin Bank Stadium' },
        { name: 'JEF United Chiba', city: 'Chiba', dept: 'Chiba', colors: ['#FFD100', '#007A33'], stadium: 'Fukuda Denshi Arena' },
      ],
    },
    {
      name: 'J2 League',
      teams: [
        { name: 'Vegalta Sendai', city: 'Sendai', dept: 'Miyagi', colors: ['#FFD100', '#0B2A6F'], stadium: 'Yurtec Stadium Sendai' },
        { name: 'RB Omiya Ardija', city: 'Saitama', dept: 'Saitama', colors: ['#F26522', '#0B2A6F'], stadium: 'NACK5 Stadium Omiya' },
        { name: 'Albirex Niigata', city: 'Niigata', dept: 'Niigata', colors: ['#F26522', '#003DA5'], stadium: 'Denka Big Swan Stadium' },
        { name: 'Yokohama FC', city: 'Yokohama', dept: 'Kanagawa', colors: ['#00A0E9', '#FFFFFF'], stadium: 'NHK Spring Mitsuzawa Football Stadium' },
        { name: 'Shonan Bellmare', city: 'Hiratsuka', dept: 'Kanagawa', colors: ['#7AC143', '#0072BC'], stadium: 'Lemon Gas Stadium Hiratsuka' },
        { name: 'Kataller Toyama', city: 'Toyama', dept: 'Toyama', colors: ['#0047AB', '#FFFFFF'], stadium: 'Toyama Athletic Stadium' },
        { name: 'Júbilo Iwata', city: 'Iwata', dept: 'Shizuoka', colors: ['#6CACE4', '#FFFFFF'], stadium: 'Yamaha Stadium' },
        { name: 'Oita Trinita', city: 'Oita', dept: 'Oita', colors: ['#0B2A6F', '#F5D100'], stadium: 'Crasus Dome Oita' },
        { name: 'Tokushima Vortis', city: 'Tokushima', dept: 'Tokushima', colors: ['#0B2A6F', '#00A651'], stadium: 'Pocari Sweat Stadium' },
        { name: 'Hokkaido Consadole Sapporo', city: 'Sapporo', dept: 'Hokkaido', colors: ['#D7000F', '#000000'], stadium: 'Sapporo Dome' },
        { name: 'Sagan Tosu', city: 'Tosu', dept: 'Saga', colors: ['#6CACE4', '#E4007F'], stadium: 'Ekimae Real Estate Stadium' },
        { name: 'Fujieda MYFC', city: 'Fujieda', dept: 'Shizuoka', colors: ['#6A2C91', '#FFFFFF'], stadium: 'Fujieda Soccer Stadium' },
        { name: 'Montedio Yamagata', city: 'Yamagata', dept: 'Yamagata', colors: ['#0B2A6F', '#FFD100'], stadium: 'ND Soft Stadium' },
        { name: 'Blaublitz Akita', city: 'Akita', dept: 'Akita', colors: ['#0047AB', '#FFFFFF'], stadium: 'Soyu Stadium' },
        { name: 'Iwaki FC', city: 'Iwaki', dept: 'Fukushima', colors: ['#D7000F', '#0B2A6F'], stadium: 'Hawaiians Stadium Iwaki' },
        { name: 'Ventforet Kofu', city: 'Kofu', dept: 'Yamanashi', colors: ['#0B2A6F', '#D7000F'], stadium: 'JIT Recycle Ink Stadium' },
        { name: 'FC Imabari', city: 'Imabari', dept: 'Ehime', colors: ['#0B2A6F', '#FFFFFF'], stadium: 'ASICS Satoyama Stadium' }, // colores no confirmados
        { name: 'Tegevajaro Miyazaki', city: 'Miyazaki', dept: 'Miyazaki', colors: ['#7B3F00', '#FFFFFF'], stadium: 'Ichigo Miyazaki Shintomi Football Stadium' }, // colores no confirmados
        { name: 'Tochigi City', city: 'Tochigi', dept: 'Tochigi', colors: ['#00A0E9', '#FFFFFF'], stadium: 'City Football Station' }, // colores no confirmados
        { name: 'Vanraure Hachinohe', city: 'Hachinohe', dept: 'Aomori', colors: ['#00A651', '#FFFFFF'], stadium: 'Prifoods Stadium' }, // colores no confirmados
      ],
    },
  ],
  sources: [
    'https://en.wikipedia.org/wiki/2026%E2%80%9327_J1_League',
    'https://en.wikipedia.org/wiki/2026%E2%80%9327_J2_League',
  ],
} satisfies CountryTeams;
