import { defineModule } from '../module';

// The vault, chaos machine, trade and personal shop state (`Economy`); their nets are the vault,
// chaos_mix, trade and personal_shop modules, which require this one. Nothing to install.
export default defineModule({
  id: 'economy',
  install() {},
});
