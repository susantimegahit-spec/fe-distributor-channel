import * as React from 'react';
import { Button } from 'react-bootstrap';
import { isRouteErrorResponse, useRouteError } from 'react-router-dom';

function ErrorFallback({ title = 'Something went wrong', message = 'Please try again or return to the dashboard.' }) {
  return (
    <div className="text-center">
      <div className="ti ti-error-404" style={{ fontSize: 200 }}></div>
      <h2>{title}</h2>
      <p className="text-muted mb-4">{message}</p>
      <Button variant="secondary" href="/">
        Back to Home Page
      </Button>
    </div>
  );
}

export function RouteErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    const title = error.status === 404 ? 'Page not found' : `${error.status} ${error.statusText}`;
    const message =
      error.status === 404 ? 'The page you are looking for is not available.' : error.data?.message || 'Unable to load this page.';

    return <ErrorFallback title={title} message={message} />;
  }

  return <ErrorFallback />;
}

export function NotFoundPage() {
  return <ErrorFallback title="Page not found" message="The page you are looking for is not available." />;
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    console.error("Logged Error:", error);
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Application error:', error, info.componentStack);
  }
  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return <ErrorFallback />;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
