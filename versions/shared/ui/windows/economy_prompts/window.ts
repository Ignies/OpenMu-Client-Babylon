import { defineWindow } from '@/controllers/interface/windows';
import { TradePrompt, EconomyPrompts } from '.';

export default [
  defineWindow({ id: 'trade_prompt', module: 'economy', slot: 'hud', order: 340, component: TradePrompt }),
  defineWindow({ id: 'economy_prompts', slot: 'hud', order: 350, component: EconomyPrompts }),
];
