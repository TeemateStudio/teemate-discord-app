export default function ChannelSelect({ channels, value, onChange, placeholder = 'Select a channel' }) {
  return (
    <select
      className="form-select"
      value={value || ''}
      onChange={(e) => onChange(e.target.value || null)}
    >
      <option value="">{placeholder}</option>
      {channels.map((ch) => (
        <option key={ch.id} value={ch.id}>
          # {ch.name}
        </option>
      ))}
    </select>
  );
}
