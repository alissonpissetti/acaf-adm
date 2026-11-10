import { extractYouTubeLinks } from '../utils/youtubeLink.js';
import { isReactionPlaceholderBody } from '../utils/whatsappContactDisplay.js';
import { WhatsAppYouTubePreview } from './WhatsAppYouTubePreview.jsx';

export function WhatsAppMessageBody({ body }) {
  const text = String(body ?? '').trim();
  if (!text) return null;
  if (isReactionPlaceholderBody(text)) return null;

  const youtubeLinks = extractYouTubeLinks(text);

  return (
    <>
      <p className="whatsapp-wa-bubble__text">{text}</p>
      {youtubeLinks.map((link) => (
        <WhatsAppYouTubePreview
          key={link.videoId}
          videoId={link.videoId}
          watchUrl={link.watchUrl}
          inputUrl={link.inputUrl}
        />
      ))}
    </>
  );
}
