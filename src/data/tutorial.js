// data/tutorial.js: the first-fight tutorial step lists (data only). Spencer 10-13 addenda: teach only how to play THIS hero, for a player who has
// never played a card game. One plain sentence per step, 10 words or fewer, each term explained the first time, no lore, no emoji, no "i" icons.
// Step = {id, glyph, text (keyword in <b>), done(cb,st)}. A "do" step ends when the player does the thing. An "explain" step (see) ends when the
// player taps the pill, plays any card or the turn changes; never on a timer. st.at = snapshot of cb when the step first showed (see snap), so a
// guided hero step needs the player to do it while the step is up, not just earlier in the fight.
export const snap=cb=>({played:cb.stat.playedCombat||0,turn:cb.turn,tt:cb.stat.tideturnsCombat||0,pay:(cb.stat.crests||0)+(cb.stat.undertows||0),wp:(cb.slots||[]).filter(Boolean).length,adv:cb.stat.advances||0,fl:cb.stat.flourishes||0,mom:cb.mom||0});
const see=(cb,st)=>!!(st.tap||(cb.stat.playedCombat||0)>st.at.played||cb.turn>st.at.turn);
const attack={id:'attack',glyph:'sword',text:'Drag an <b>attack</b> card onto the enemy to hit it.',done:cb=>cb.stat.attacksCombat>=1};
const energy={id:'energy',glyph:'bolt',text:'Cards cost <b>energy</b>: the number in the glowing orb.',done:see};
const ring=(t)=>({id:'ring',glyph:'bolt',text:t,done:see});
const hold={id:'hold',glyph:'bolt',text:'Press and <b>hold</b> the orb to see what it does.',done:cb=>!!cb.tutHeld};
const intent={id:'intent',glyph:'sword',text:'The icon above the enemy shows its <b>next move</b>.',done:see};
const guard={id:'guard',glyph:'shield',text:'Play a <b>Guard</b> card to block damage from that hit.',done:cb=>cb.p.block>0||cb.turn>1};
const guardGone={id:'guardgone',glyph:'shield',text:'Guard soaks damage, then vanishes when your next turn starts.',done:cb=>cb.turn>1};
const refill={id:'refill',glyph:'hourglass',text:'Your <b>energy</b> refills at the start of each turn.',done:see};
const basics=r=>[attack,energy,ring(r),hold,intent,guard,guardGone,refill];
export const TUTORIAL={
 tide:[...basics('The orb\'s ring shows your <b>Tide</b>, from 0 to 10.'),
  {id:'tide',glyph:'wave',text:'Play a card that raises or lowers the <b>Tide</b>.',done:(cb,st)=>(cb.stat.tideturnsCombat||0)>st.at.tt||cb.turn>st.at.turn+2},
  {id:'crest',glyph:'wave',text:'Raise the Tide to 10 to hit every enemy.',done:(cb,st)=>cb.stat.crests+cb.stat.undertows>st.at.pay||cb.turn>st.at.turn+2}],
 echo:[...basics('The orb\'s ring counts free card <b>replays</b> this turn.'),
  {id:'marks',glyph:'bell',text:'Your first attack and first skill each turn get <b>marked</b>.',done:see},
  {id:'bell',glyph:'bell',text:'Tap the orb, then a card, to move a mark.',done:(cb,st)=>!!cb.armMark||cb.turn>st.at.turn+1},
  {id:'echo',glyph:'bell',text:'When your turn ends, marked cards play again for free.',done:(cb,st)=>cb.turn>st.at.turn}],
 carto:[...basics('The orb\'s ring counts your <b>Waypoints</b>, up to 3.'),
  {id:'wp',glyph:'map',text:'Play a <b>Waypoint</b>, a card that stays and acts.',done:(cb,st)=>cb.slots.filter(Boolean).length>st.at.wp||cb.turn>st.at.turn+1},
  {id:'fire',glyph:'map',text:'Waypoints act by themselves at the start of each turn.',done:see},
  {id:'adv',glyph:'compass',text:'Tap the orb, then a Waypoint, to make it stronger.',done:(cb,st)=>cb.stat.advances>st.at.adv||cb.turn>st.at.turn+2}],
 duel:[...basics('The orb\'s ring shows your <b>Momentum</b>, up to 5.'),
  {id:'mom',glyph:'sword',text:'Each attack you play adds 1 <b>Momentum</b>.',done:see},
  {id:'flourish',glyph:'bolt',text:'Tap the orb, then an attack, to multiply its damage.',done:(cb,st)=>cb.stat.flourishes>st.at.fl||cb.turn>st.at.turn+2}]};
export const TUT_MAX_WORDS=10;
