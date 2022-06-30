export const AttributeInterpolation1 = () => {
  var url = 'pug-test.html';
  url = 'https://example.com/';
  return <>
    <a href={'/' + url}>Link</a>
    <a href={url}>Another link</a>
  </>;
};
