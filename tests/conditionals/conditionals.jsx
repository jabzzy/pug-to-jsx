export const Conditionals = () => {
  var user = {
    description: 'foo bar baz'
  };
  var authorised = false;
  return <div id={'user'}>{user.description ? <><p className={'description'}>Use has description</p></> : authorised ? <><p className={'authorized'}>User has no description,
        why not add one...</p></> : <><p className={'description'}>User has no description</p></>}</div>;
};
