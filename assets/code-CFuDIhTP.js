const e=`const data = {
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
`;export{e as default};
