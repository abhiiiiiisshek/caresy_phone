// react-native-maps behind a platform-resolved module (see maps.web.ts).
//
// The web bundler cannot parse this package's native internals
// (codegenNativeCommands), which is why tracking.tsx used to hide the import
// behind eval("require"). That kept web happy by also defeating Metro's static
// analysis on native — the map was left out of the production bundle entirely
// and silently never rendered on a real device. Metro picks maps.web.ts for
// web and this file everywhere else, so native gets a real, statically bundled
// import.
export { default as MapView, Marker } from 'react-native-maps';
