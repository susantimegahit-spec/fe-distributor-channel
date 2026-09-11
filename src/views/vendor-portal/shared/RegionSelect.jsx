import { useEffect, useState } from 'react';
import Select from 'react-select';
import VendorServices from 'services/vendor-portal/VendorServices';

export default function RegionSelect({ name, label, resource, parentKey, parentId, value, onChange, disabled }) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const ready = !parentKey || Boolean(parentId);

  useEffect(() => {
    let active = true;
    setOptions([]);
    setError('');
    setLoading(ready);
    if (ready) {
      VendorServices.getRegions(resource, parentKey ? { [parentKey]: parentId } : {})
        .then((response) => {
          if (!active) return;
          if (!(response?.status >= 200 && response.status < 300) || response?.data?.success === false) {
            throw new Error(response?.data?.message || 'Unable to load regions.');
          }
          const data = response?.data?.data ?? response?.data;
          const rows = Array.isArray(data) ? data : (data?.data ?? data?.items ?? data?.[resource]);
          if (!Array.isArray(rows)) throw new Error('Unexpected region data format.');
          setOptions(rows);
        })
        .catch((requestError) => {
          if (active) setError(requestError.response?.data?.message || requestError.message || 'Unable to load regions.');
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }
    return () => {
      active = false;
    };
  }, [resource, parentKey, parentId, ready, retry]);

  return (
    <div className="vp-region-field">
      <label htmlFor={`vp-${name}`}>
        {label}{' '}
        <span className="text-danger" aria-hidden="true">
          *
        </span>
      </label>
      <Select
        inputId={`vp-${name}`}
        instanceId={`vp-region-${name}`}
        name={name}
        classNamePrefix="vp-region-select"
        options={options.map((option) => ({ value: String(option.id), label: option.name }))}
        value={
          options
            .filter((option) => String(option.id) === String(value))
            .map((option) => ({ value: String(option.id), label: option.name }))[0] || null
        }
        onChange={(option) => onChange(option?.value || '', option?.label || '')}
        isDisabled={disabled || !ready || loading || Boolean(error)}
        isLoading={loading}
        isSearchable
        isClearable
        placeholder={`Select ${label}`}
        loadingMessage={() => 'Loading...'}
        noOptionsMessage={() => 'No regions found.'}
        menuPlacement="auto"
        menuPosition="fixed"
        maxMenuHeight={200}
        aria-required="true"
        aria-describedby={`vp-${name}-status`}
      />
      <small id={`vp-${name}-status`} role="status">
        {error || (ready && !loading && !options.length ? 'No regions available.' : '')}
      </small>
      {error ? (
        <button type="button" className="vp-link" disabled={disabled} onClick={() => setRetry((current) => current + 1)}>
          Try again
        </button>
      ) : null}
    </div>
  );
}
