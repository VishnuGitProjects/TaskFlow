function AuthLayout({ children }) {
  return (
    <div className="container-fluid vh-100 d-flex justify-content-center align-items-center bg-light">
      {children}
    </div>
  );
}

export default AuthLayout;