export const Unless = () => {
  return <>{!user.isAnonymous ? <><p>You're logged in as {user.name}</p></> : null}</>;
};
