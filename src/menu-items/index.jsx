// project-imports
import chartsMaps from './charts-maps';
import formComponents from './forms';
import other from './other';
import pages from './pages';
import uiComponents from './ui-components';
import tableRoutes from './tables';
import navigation from './navigation';
import { getCookies } from '../utils/cookies';
import { useEffect } from 'react';
import listMenu from './list-menu';

// ==============================|| MENU ITEMS ||============================== //
// const listMenu = getCookies('menu');
// const listMenu = {
//   id: 'charts-maps',
//   title: 'Charts-maps',
//   type: 'group',
//   children: [
//     {
//       id: 'charts',
//       title: 'Charts',
//       type: 'collapse',
//       icon: 'ph ph-chart-donut',
//       selected: true,
//       children: [
//         {
//           id: 'apex-chart',
//           title: 'Apex chart',
//           type: 'item',
//           url: '/charts/apex-chart'
//         }
//       ]
//     },
//     {
//       id: 'map',
//       title: 'Map',
//       type: 'collapse',
//       icon: 'ph ph-map-trifold',
//       children: [
//         {
//           id: 'google-map',
//           title: 'Google map',
//           type: 'item',
//           url: '/map/google-map'
//         }
//       ]
//     }
//   ]
// };
const menuItems = {
  items: listMenu
};

export default menuItems;
