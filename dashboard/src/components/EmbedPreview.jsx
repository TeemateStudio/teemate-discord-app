function intToHex(color) {
  if (color == null) return '#5865F2';
  return '#' + color.toString(16).padStart(6, '0');
}

function BotAvatar() {
  return (
    <div className="dp-avatar">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="#fff">
        <path d="M12 2a4 4 0 0 0-4 4v1H6.5A2.5 2.5 0 0 0 4 9.5v8A2.5 2.5 0 0 0 6.5 20h11a2.5 2.5 0 0 0 2.5-2.5v-8A2.5 2.5 0 0 0 17.5 7H16V6a4 4 0 0 0-4-4zm-2 4a2 2 0 1 1 4 0v1h-4V6zm-1 7a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm6 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z" />
      </svg>
    </div>
  );
}

function BotBadge() {
  return (
    <span className="dp-bot-badge">
      <svg viewBox="0 0 16 16" width="10" height="10" fill="#fff">
        <path d="M5.9 12.6L2 8.7l1.4-1.4 2.5 2.5 5.7-5.7L13 5.5l-7.1 7.1z" />
      </svg>
      BOT
    </span>
  );
}

export default function EmbedPreview({ data }) {
  if (!data) return null;
  const color = intToHex(data.color);
  const hasAuthor = data.author?.name;
  const hasFooter = data.footer?.text;
  const hasFields = data.fields?.length > 0;
  const hasThumbnail = data.thumbnail?.url;
  const hasImage = data.image?.url;
  const isEmpty = !data.title && !data.description && !hasAuthor && !hasFooter && !hasFields && !hasThumbnail && !hasImage;

  const now = new Date();
  const timeStr = "Aujourd'hui a " + now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="dp-wrapper">
      <div className="dp-label">Apercu Discord</div>
      <div className="dp-message-area">
        <div className="dp-message">
          <BotAvatar />
          <div className="dp-message-content">
            <div className="dp-message-header">
              <span className="dp-username">Teemate</span>
              <BotBadge />
              <span className="dp-timestamp">{timeStr}</span>
            </div>

            {isEmpty ? (
              <div className="ep-container ep-empty" style={{ '--ep-color': color }}>
                <div className="ep-body">
                  <div className="ep-description" style={{ opacity: 0.4, fontStyle: 'italic' }}>
                    L'apercu de l'embed apparaitra ici...
                  </div>
                </div>
              </div>
            ) : (
              <div className="ep-container" style={{ '--ep-color': color }}>
                <div className="ep-body">
                  <div className="ep-content">
                    {hasAuthor && (
                      <div className="ep-author">
                        {data.author.icon_url && (
                          <img className="ep-author-icon" src={data.author.icon_url} alt="" />
                        )}
                        {data.author.url ? (
                          <a className="ep-author-name" href={data.author.url} target="_blank" rel="noreferrer">
                            {data.author.name}
                          </a>
                        ) : (
                          <span className="ep-author-name">{data.author.name}</span>
                        )}
                      </div>
                    )}

                    {data.title && (
                      <div className="ep-title">
                        {data.url ? (
                          <a href={data.url} target="_blank" rel="noreferrer">{data.title}</a>
                        ) : data.title}
                      </div>
                    )}

                    {data.description && (
                      <div className="ep-description">{data.description}</div>
                    )}

                    {hasFields && (
                      <div className="ep-fields">
                        {data.fields.map((f, i) => (
                          <div key={i} className={`ep-field ${f.inline ? 'ep-field-inline' : ''}`}>
                            {f.name && <div className="ep-field-name">{f.name}</div>}
                            {f.value && <div className="ep-field-value">{f.value}</div>}
                          </div>
                        ))}
                      </div>
                    )}

                    {hasImage && (
                      <img className="ep-image" src={data.image.url} alt="" />
                    )}
                  </div>

                  {hasThumbnail && (
                    <img className="ep-thumbnail" src={data.thumbnail.url} alt="" />
                  )}
                </div>

                {(hasFooter || data.timestamp) && (
                  <div className="ep-footer">
                    {data.footer?.icon_url && (
                      <img className="ep-footer-icon" src={data.footer.icon_url} alt="" />
                    )}
                    <span>
                      {data.footer?.text}
                      {data.footer?.text && data.timestamp && ' \u2022 '}
                      {data.timestamp && now.toLocaleDateString('fr-FR', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
