// Explicit dev resource selection; an omitted/mismatched mode must never use live data.
export function runtimeEnvironment(env: NodeJS.ProcessEnv) {
  const staging = env.FAMILY_PAWS_ENV === 'staging';
  if (env.FAMILY_PAWS_ENV && !['production', 'staging'].includes(env.FAMILY_PAWS_ENV)) throw new Error('Unknown deployment environment');
  const projectId = 'niu-niu-family-paws';
  const databaseId = staging ? 'development' : '(default)';
  const bucket = staging ? 'niu-niu-family-paws-dev-pet-photos' : 'niu-niu-family-paws-pet-photos';
  for (const value of [env.GCLOUD_PROJECT, env.GOOGLE_CLOUD_PROJECT]) {
    if (value && value !== projectId) throw new Error('Deployment project does not match environment');
  }
  if (env.K_SERVICE && env.K_SERVICE !== (staging ? 'family-paws-api-dev' : 'family-paws-api')) throw new Error('Service does not match environment');
  return { projectId, databaseId, bucket };
}
