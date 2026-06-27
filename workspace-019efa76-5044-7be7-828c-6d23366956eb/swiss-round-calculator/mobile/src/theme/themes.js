/**
 * Light / dark palette.
 *
 * Highlight-cell numbers (Section-4 matrix gradients):
 *   - Light mode: WHITE on blue/red gradient.
 *   - Dark mode:  BEIGE (#F5F5DC) on blue/red gradient — per user
 *     spec ("set the numbers of the highlighted columns to beige in
 *     dark mode while keeping them white in light mode").
 *
 * textSoft is now slightly stronger (LIGHT: #333, DARK: #DDD) so any
 * secondary captions remain legible. Most labels however use the
 * full `text` colour so Chinese and English read at the same
 * intensity.
 */
export const LIGHT = {
  mode: 'light',
  bg: '#FAFAFA',
  card: '#FFFFFF',
  text: '#111111',
  textSoft: '#333333',
  border: '#BBBBBB',
  inputBg: '#FFFFFF',
  inputText: '#111111',
  primary: '#0050B3',
  primaryText: '#FFFFFF',
  accent: '#72A7CF',
  warn: '#B85C00',
  err: '#B00020',
  tableBg: '#F5F5DC',
  tableText: '#111111',
  gradPlayerA: '#0000FF',
  gradPlayerMid: '#ADD8E6',
  gradPlayerNumber: '#FFFFFF',  // light mode: white
  gradPlayerStroke: '#000000',
  gradRangeA: '#FF0000',
  gradRangeMid: '#FF7F7F',
  gradRangeNumber: '#FFFFFF',   // light mode: white
  gradRangeStroke: '#000000',
  tooltipBg: '#222222',
  tooltipText: '#FFFFFF',
  navBg: '#FFFFFF',
  navText: '#222222',
  navActive: '#0050B3',
  shadow: 'rgba(0,0,0,0.15)',
};

export const DARK = {
  mode: 'dark',
  bg: '#0E0E10',
  card: '#1A1A1D',
  text: '#F2F2F2',
  textSoft: '#DDDDDD',
  border: '#444444',
  inputBg: '#222226',
  inputText: '#F2F2F2',
  primary: '#5BA3FF',
  primaryText: '#0B0B0B',
  accent: '#72A7CF',
  warn: '#FFB066',
  err: '#FF6E6E',
  tableBg: '#F0DC82',
  tableText: '#111111',
  gradPlayerA: '#0000FF',
  gradPlayerMid: '#00008B',
  gradPlayerNumber: '#F5F5DC',  // dark mode: beige per user spec
  gradPlayerStroke: '#000000',
  gradRangeA: '#FF0000',
  gradRangeMid: '#8B0000',
  gradRangeNumber: '#F5F5DC',   // dark mode: beige per user spec
  gradRangeStroke: '#000000',
  tooltipBg: '#F2F2F2',
  tooltipText: '#111111',
  navBg: '#161618',
  navText: '#EEEEEE',
  navActive: '#5BA3FF',
  shadow: 'rgba(0,0,0,0.5)',
};

export const FONT = {
  song: 'ChironSungHK',     // 'Chiron Sung HK'
  hei: 'ChironHeiHK',       // 'Chiron Hei HK'
  goround: 'ChironGoRoundTC', // 'Chiron GoRound TC'
  peak: 'ThePeakFontPlus',  // 'The Peak Font Plus'
};
