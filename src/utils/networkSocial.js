export const emptyNetworkSocial = {
  website: '',
  instagram: '',
  facebook: '',
  whatsapp: '',
  tiktok: '',
  youtube: '',
  linkedin: '',
};

export function networkSocialFromNetwork(network) {
  return {
    ...emptyNetworkSocial,
    ...(network?.social ?? {}),
  };
}
