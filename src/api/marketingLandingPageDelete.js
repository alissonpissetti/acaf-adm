import {
  deactivateMarketingLandingPage,
  getMarketingLandingPage,
} from './marketing.js';

export const LEGACY_API_DEPLOY_MESSAGE = [
  'A API em produção ainda está na versão antiga: o DELETE só inativou o formulário (resposta { ok: true } sem removed: true).',
  '',
  'Para exclusão definitiva pelo admin:',
  '1. Redeploy do serviço acaf-api no Coolify a partir da branch main (o Dockerfile roda npm run build).',
  '2. Confirme que DELETE .../landing-pages/:id?force=1 retorna { "removed": true }.',
  '',
  'Emergência (banco de produção): na pasta acaf-api,',
  'DATABASE_URL="..." npm run force-delete-landing-page -- <id ou slug>',
].join('\n');

function isNotFoundError(err) {
  const msg = err?.message ?? '';
  return /não encontrado|not found|404/i.test(msg);
}

const verifyDelayMs = 500;

/**
 * DELETE com verificação pós-resposta (compatível com API legada em produção).
 * @returns {{ status: 'removed' | 'legacy_soft_delete', result: object }}
 */
export async function deactivateAndVerifyMarketingLandingPage(id, { force = true } = {}) {
  const result = await deactivateMarketingLandingPage(id, { force });
  if (result?.removed === true) {
    return { status: 'removed', result };
  }

  await new Promise((resolve) => setTimeout(resolve, verifyDelayMs));

  let page = null;
  try {
    page = await getMarketingLandingPage(id);
  } catch (err) {
    if (isNotFoundError(err)) {
      return {
        status: 'removed',
        result: { ...result, removed: true, verifiedByGet: true },
      };
    }
    throw err;
  }

  if (page?.active === false || result?.ok === true) {
    return { status: 'legacy_soft_delete', result, page };
  }

  throw new Error(
    'O servidor não confirmou a exclusão definitiva. Verifique se a API em produção está atualizada e tente novamente.',
  );
}
