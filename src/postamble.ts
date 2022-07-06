export const postamble = (operations: string[]) =>
  operations
    .map(
      op => `
export function ${op}<Sel extends Selection<$RootTypes.${op}>>(
  selectFn: (q: $RootTypes.${op}) => [...Sel]
) {
  let field = new $Field<'${op}', GetOutput<Sel>, GetVariables<Sel>>('${op}', {
    selection: selectFn(new $Root.${op}()),
  })
  const str = fieldToQuery('${op}', field)

  return gql(str) as any as TypedDocumentNode<GetOutput<Sel>, GetVariables<Sel>>
}
`
    )
    .join('\n')
