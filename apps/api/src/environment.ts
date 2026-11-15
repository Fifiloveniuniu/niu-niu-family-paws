// Only these projects are supported. A staging deployment must never fall back to production.
export function runtimeEnvironment(env: NodeJS.ProcessEnv) {
  const staging = env.FAMILY_PAWS_ENV === 'staging';
  if (env.FAMILY_PAWS_ENV && !['production', 'staging'].includes(env.FAMILY_PAWS_ENV)) throw new Error('Unknown deployment environment');
  const projectId = staging ? 'niu-niu-family-paws-dev' : 'niu-niu-family-paws';
  const bucket = `${projectId}-pet-photos`;
  for (const value of [env.GCLOUD_PROJECT, env.GOOGLE_CLOUD_PROJECT]) {
    if (value && value !== projectId) throw new Error('Deployment project does not match environment');
  }
  return { projectId, bucket };
}
