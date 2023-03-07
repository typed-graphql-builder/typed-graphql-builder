export const postamble = (operations: string[]) =>
  operations
    .map(
      op => `
export function ${op}<Sel extends Selection<$RootTypes.${op}>>(
  name: string,
  selectFn: (q: $RootTypes.${op}) => [...Sel]
): TypedDocumentNode<GetOutput<Sel>, GetVariables<Sel>>
export function ${op}<Sel extends Selection<$RootTypes.${op}>>(
  selectFn: (q: $RootTypes.${op}) => [...Sel]
): TypedDocumentNode<GetOutput<Sel>, Simplify<GetVariables<Sel>>>
export function ${op}<Sel extends Selection<$RootTypes.query>>(name: any, selectFn?: any) {
  if (!selectFn) {
    selectFn = name
    name = ''
  }
  let field = new $Field<'${op}', GetOutput<Sel>, GetVariables<Sel>>('${op}', {
    selection: selectFn(new $Root.${op}()),
  })
  const str = fieldToQuery(\`${op} \${name}\`, field)

  return gql(str) as any
}
`
    )
    .join('\n')
