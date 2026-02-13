export default function RoleSelect({ roles, value, onChange, placeholder = 'Select a role' }) {
  return (
    <select
      className="form-select"
      value={value || ''}
      onChange={(e) => onChange(e.target.value || null)}
    >
      <option value="">{placeholder}</option>
      {roles.map((r) => (
        <option key={r.id} value={r.id}>
          @ {r.name}
        </option>
      ))}
    </select>
  );
}
