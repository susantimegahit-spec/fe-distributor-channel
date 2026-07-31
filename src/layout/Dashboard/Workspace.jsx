import PropTypes from 'prop-types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const WORKSPACE_STORAGE_KEY = 'dc-browser-workspace-v1';

const getSystemKeyFromPath = (path = '') => {
  if (path.startsWith('/expedition')) return 'expedition';
  if (path.startsWith('/picking-list')) return 'picking-list';
  if (path.startsWith('/production')) return 'production';
  if (path.startsWith('/support')) return 'support';
  return 'customer-portal';
};

const readWorkspace = () => {
  try {
    const stored = JSON.parse(sessionStorage.getItem(WORKSPACE_STORAGE_KEY) || '{}');
    return {
      tabs: Array.isArray(stored.tabs) ? stored.tabs : [],
      activePath: typeof stored.activePath === 'string' ? stored.activePath : ''
    };
  } catch {
    return { tabs: [], activePath: '' };
  }
};

const getEmbeddedUrl = (path) => {
  const url = new URL(path, window.location.origin);
  url.searchParams.set('workspaceWindow', '1');
  return `${url.pathname}${url.search}${url.hash}`;
};

export default function Workspace({ activePath, menuTitle, systemTitle, systemKey }) {
  const navigate = useNavigate();
  const initialWorkspace = useMemo(readWorkspace, []);
  const [tabs, setTabs] = useState(initialWorkspace.tabs);
  const [selectedPath, setSelectedPath] = useState(initialWorkspace.activePath);
  const [draggedPath, setDraggedPath] = useState('');
  const [dragOverPath, setDragOverPath] = useState('');
  const tabRefs = useRef(new Map());

  const openTab = useCallback((path, title, currentSystemTitle, currentSystemKey) => {
    if (!path) return;
    setTabs((current) => {
      const existing = current.find((tab) => tab.path === path);
      if (existing) {
        return current.map((tab) =>
          tab.path === path
            ? {
                ...tab,
                title: title || tab.title,
                systemTitle: currentSystemTitle || tab.systemTitle,
                systemKey: currentSystemKey || tab.systemKey
              }
            : tab
        );
      }

      return [
        ...current,
        {
          path,
          title: title || 'Workspace',
          systemTitle: currentSystemTitle || 'Distributor Channel',
          systemKey: currentSystemKey || 'customer-portal'
        }
      ];
    });
    setSelectedPath(path);
  }, []);

  useEffect(() => {
    openTab(activePath, menuTitle, systemTitle, systemKey);
  }, [activePath, menuTitle, openTab, systemKey, systemTitle]);

  useEffect(() => {
    const handleOpenTab = (event) => {
      const { path, title } = event.detail || {};
      openTab(path, title, systemTitle, systemKey);
    };
    window.addEventListener('dc:open-workspace-tab', handleOpenTab);
    return () => window.removeEventListener('dc:open-workspace-tab', handleOpenTab);
  }, [openTab, systemKey, systemTitle]);

  useEffect(() => {
    sessionStorage.setItem(
      WORKSPACE_STORAGE_KEY,
      JSON.stringify({
        tabs,
        activePath: selectedPath
      })
    );
  }, [selectedPath, tabs]);

  useEffect(() => {
    if (!selectedPath) return undefined;

    const animationFrame = window.requestAnimationFrame(() => {
      tabRefs.current.get(selectedPath)?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest'
      });
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [selectedPath, tabs]);

  const selectTab = (path) => {
    setSelectedPath(path);
    if (path !== activePath) {
      navigate(path);
    }
  };

  const closeTab = (event, path) => {
    event.stopPropagation();
    const closingIndex = tabs.findIndex((tab) => tab.path === path);
    const nextTabs = tabs.filter((tab) => tab.path !== path);
    setTabs(nextTabs);

    if (selectedPath !== path) return;

    const fallbackTab = nextTabs[Math.min(closingIndex, nextTabs.length - 1)];
    const fallbackPath = fallbackTab?.path || '';
    setSelectedPath(fallbackPath);
    if (fallbackPath) {
      navigate(fallbackPath);
    }
  };

  const moveTab = (sourcePath, targetPath) => {
    if (!sourcePath || !targetPath || sourcePath === targetPath) return;

    setTabs((current) => {
      const sourceIndex = current.findIndex((tab) => tab.path === sourcePath);
      const targetIndex = current.findIndex((tab) => tab.path === targetPath);
      if (sourceIndex < 0 || targetIndex < 0) return current;

      const reordered = [...current];
      const [movedTab] = reordered.splice(sourceIndex, 1);
      reordered.splice(targetIndex, 0, movedTab);
      return reordered;
    });
  };

  return (
    <section className="sm-browser-workspace">
      <header className="sm-browser-toolbar">
        <div className="sm-browser-tabs" role="tablist" aria-label="Open menu tabs">
          {tabs.map((tab) => {
            const active = tab.path === selectedPath;
            return (
              <div
                ref={(element) => {
                  if (element) {
                    tabRefs.current.set(tab.path, element);
                  } else {
                    tabRefs.current.delete(tab.path);
                  }
                }}
                role="tab"
                aria-selected={active}
                data-system-theme={tab.systemKey || getSystemKeyFromPath(tab.path)}
                draggable
                className={`sm-browser-tab ${active ? 'is-active' : ''} ${
                  draggedPath === tab.path ? 'is-dragging' : ''
                } ${dragOverPath === tab.path && draggedPath !== tab.path ? 'is-drag-over' : ''}`}
                key={tab.path}
                onDragStart={(event) => {
                  if (event.target.closest('.sm-browser-tab-close')) {
                    event.preventDefault();
                    return;
                  }
                  setDraggedPath(tab.path);
                  event.dataTransfer.effectAllowed = 'move';
                  event.dataTransfer.setData('text/plain', tab.path);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = 'move';
                  setDragOverPath(tab.path);
                }}
                onDragLeave={() => {
                  if (dragOverPath === tab.path) setDragOverPath('');
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  moveTab(event.dataTransfer.getData('text/plain') || draggedPath, tab.path);
                  setDraggedPath('');
                  setDragOverPath('');
                }}
                onDragEnd={() => {
                  setDraggedPath('');
                  setDragOverPath('');
                }}
              >
                <button
                  type="button"
                  className="sm-browser-tab-select"
                  onClick={() => selectTab(tab.path)}
                  onKeyDown={(event) => {
                    if (!event.altKey || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
                    event.preventDefault();
                    const currentIndex = tabs.findIndex((item) => item.path === tab.path);
                    const targetIndex = event.key === 'ArrowLeft' ? currentIndex - 1 : currentIndex + 1;
                    if (tabs[targetIndex]) moveTab(tab.path, tabs[targetIndex].path);
                  }}
                >
                  <i className="ti ti-layout-dashboard" aria-hidden="true" />
                  <span>
                    <small>{tab.systemTitle}</small>
                    <strong>{tab.title}</strong>
                  </span>
                </button>
                <button
                  type="button"
                  className="sm-browser-tab-close"
                  aria-label={`Close ${tab.title}`}
                  onClick={(event) => closeTab(event, tab.path)}
                >
                  <i className="ti ti-x" />
                </button>
              </div>
            );
          })}
        </div>
        <div className="sm-browser-toolbar-actions">
          <span className="sm-browser-workspace-status" aria-hidden="true">
            <span className="sm-browser-online-dot" />
            <span>Workspace</span>
          </span>
          <span
            className="sm-browser-tab-count"
            aria-live="polite"
            aria-label={`${tabs.length} open ${tabs.length === 1 ? 'tab' : 'tabs'}`}
          >
            <i className="ti ti-folders" aria-hidden="true" />
            {tabs.length} {tabs.length === 1 ? 'Tab' : 'Tabs'}
          </span>
          <button
            type="button"
            className="sm-browser-close-all"
            disabled={tabs.length === 0}
            onClick={() => {
              setTabs([]);
              setSelectedPath('');
              window.dispatchEvent(new CustomEvent('dc:workspace-tabs-cleared'));
            }}
          >
            <i className="ti ti-x" aria-hidden="true" />
            Close All
          </button>
        </div>
      </header>

      <div className="sm-browser-content">
        {tabs.map((tab) => (
          <iframe
            className={`sm-browser-frame ${tab.path === selectedPath ? 'is-active' : ''}`}
            key={tab.path}
            src={getEmbeddedUrl(tab.path)}
            title={`${tab.title} tab`}
          />
        ))}

        {tabs.length === 0 && (
          <div className="sm-workspace-empty">
            <span>
              <i className="ti ti-browser" />
            </span>
            <h3>No tabs open</h3>
            <p>Select a menu from the sidebar to open a new tab.</p>
          </div>
        )}
      </div>
    </section>
  );
}

Workspace.propTypes = {
  activePath: PropTypes.string,
  menuTitle: PropTypes.string,
  systemTitle: PropTypes.string,
  systemKey: PropTypes.string
};
