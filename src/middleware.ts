import { defineMiddleware } from 'astro:middleware';
import { auth } from './lib/auth';

export const onRequest = defineMiddleware(async (context, next) => {
  const authSession = await auth.api.getSession({
    headers: context.request.headers,
  });

  if (authSession) {
    context.locals.user = authSession.user;
    context.locals.session = authSession.session;
  } else {
    context.locals.user = null;
    context.locals.session = null;
  }

  const path = context.url.pathname;

  if (path === '/login' && authSession) {
    const target = context.url.searchParams.get('redirect') ?? '/';
    return context.redirect(target);
  }

  return next();
});
