import { Navigate } from 'react-router-dom';

// The Google OAuth redirect target of the original app. Sign-in is now a username/password form on /login.
const AuthCallbackPage = () => <Navigate to="/login" replace />;

export default AuthCallbackPage;
