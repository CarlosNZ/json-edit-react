// The editable source shown in the react-live playground. `JsonEditor`,
// `useState`, and the picker-selected `theme` come from the injected scope (see
// liveScope.ts + ExamplePage). noInline mode, so the snippet ends in
// `render(...)`.
export default `const data = {
  user: {
    name: 'Ada Lovelace',
    roles: ['admin', 'editor'],
    address: { city: 'London', country: 'UK' },
  },
  active: true,
  loginCount: 42,
}

function Demo() {
  const [value, setValue] = useState(data)
  return (
    <JsonEditor
      data={value}
      setData={setValue}
      theme={theme}
      rootName="profile"
      collapse={1}
    />
  )
}

render(<Demo />)
`
