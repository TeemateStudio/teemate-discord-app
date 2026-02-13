import BlockCard from './BlockCard.jsx';

function generateId() {
  return `blk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

const BLOCK_TEMPLATES = {
  message: () => ({ id: generateId(), type: 'message', content: '' }),
  delay: () => ({ id: generateId(), type: 'delay', delaySeconds: 5 }),
  action: () => ({
    id: generateId(),
    type: 'action',
    actionMessage: '',
    components: [{ type: 'button', placeholder: '', options: [] }],
  }),
};

export default function BlockList({ blocks, roles, emojis, onChange }) {
  function addBlock(type) {
    if (blocks.length >= 20) return;
    onChange([...blocks, BLOCK_TEMPLATES[type]()]);
  }

  function removeBlock(index) {
    onChange(blocks.filter((_, i) => i !== index));
  }

  function updateBlock(index, data) {
    const updated = [...blocks];
    updated[index] = data;
    onChange(updated);
  }

  function moveBlock(index, dir) {
    const newIdx = index + dir;
    if (newIdx < 0 || newIdx >= blocks.length) return;
    const updated = [...blocks];
    [updated[index], updated[newIdx]] = [updated[newIdx], updated[index]];
    onChange(updated);
  }

  return (
    <div className="ob-block-list">
      {blocks.map((block, i) => (
        <div key={block.id}>
          {i > 0 && <div className="ob-connector" />}
          <BlockCard
            block={block}
            index={i}
            total={blocks.length}
            roles={roles}
            emojis={emojis}
            onUpdate={(data) => updateBlock(i, data)}
            onRemove={() => removeBlock(i)}
            onMove={(dir) => moveBlock(i, dir)}
          />
        </div>
      ))}

      <div className="ob-add-row">
        <button className="btn btn-ghost" onClick={() => addBlock('message')} disabled={blocks.length >= 20}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Message
        </button>
        <button className="btn btn-ghost" onClick={() => addBlock('delay')} disabled={blocks.length >= 20}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          Delay
        </button>
        <button className="btn btn-ghost" onClick={() => addBlock('action')} disabled={blocks.length >= 20}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></svg>
          Action
        </button>
      </div>
    </div>
  );
}
