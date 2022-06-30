export const AmpAttributes = () => {
  var attributes = {};
  attributes.class = 'baz';
  return <div id={'foo'} data-bar={"foo"} {...attributes} {...{
    lol: 'kek'
  }}></div>;
};
