import * as React from 'react';
import { isRouteErrorResponse, useRouteError } from 'react-router-dom';
import PropTypes from 'prop-types';
import ErrorPage from './errors/ErrorPage';

function ErrorFallback({ status = 500, title, message }) {
  return <ErrorPage status={status} title={title} description={message} />;
}

export function RouteErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    return <ErrorFallback status={error.status} message={error.data?.message} />;
  }

  return <ErrorFallback />;
}

export function NotFoundPage() {
  return <ErrorFallback status={404} />;
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    console.error('Logged Error:', error);
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Application error:', error, info.componentStack);
  }
  render() {
    if (this.state.hasError) {
      return <ErrorFallback status={500} />;
    }

    return this.props.children;
  }
}

ErrorFallback.propTypes = {
  status: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  title: PropTypes.string,
  message: PropTypes.string
};

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired
};

export default ErrorBoundary;
