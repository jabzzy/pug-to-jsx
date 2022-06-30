export const AttributesExpr = () => {
  var authenticated = true;
  var someUnusedVar = true;
  var someOtherUnusedVar = true;
  return <body className={authenticated ? 'authed' : 'anon'}></body>;
};
