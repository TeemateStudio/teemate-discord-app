function intToHex(color) {
  if (color == null) return '#5865F2';
  return '#' + color.toString(16).padStart(6, '0');
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

  if (isEmpty) {
    return (
      <div className="ep-container" style={{ '--ep-color': color }}>
        <div className="ep-body">
          <div className="ep-description" style={{ opacity: 0.5 }}>
            Embed preview will appear here...
          </div>
        </div>
      </div>
    );
  }

  return (
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
                  <div className="ep-field-name">{f.name}</div>
                  <div className="ep-field-value">{f.value}</div>
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
            {data.timestamp && new Date().toLocaleDateString('en-US', {
              month: 'short', day: 'numeric', year: 'numeric',
            })}
          </span>
        </div>
      )}
    </div>
  );
}
