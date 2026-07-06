import { useMemo } from 'react';
import Pagination from 'react-bootstrap/Pagination';
import Stack from 'react-bootstrap/Stack';

export default function TablePagination({ currentPage, onPageChange, pageCount, pageSize, total, itemLabel, className = '' }) {
  const paginationItems = useMemo(() => {
    const range = [];
    const maxVisiblePages = 5;

    if (pageCount <= maxVisiblePages) {
      for (let i = 1; i <= pageCount; i++) {
        range.push(i);
      }
    } else {
      range.push(1);

      let start = Math.max(2, currentPage - 1);
      let end = Math.min(pageCount - 1, currentPage + 1);

      if (currentPage <= 2) {
        end = 3;
      } else if (currentPage >= pageCount - 1) {
        start = pageCount - 2;
      }

      if (start > 2) {
        range.push('ellipsis1');
      }

      for (let i = start; i <= end; i++) {
        range.push(i);
      }

      if (end < pageCount - 1) {
        range.push('ellipsis2');
      }

      range.push(pageCount);
    }

    return range;
  }, [currentPage, pageCount]);

  const safeTotal = Number(total) || 0;
  const startItem = safeTotal === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, safeTotal);

  return (
    <Stack direction="horizontal" gap={2} className={`flex-wrap justify-content-between mt-4 ${className}`.trim()}>
      <small className="text-muted fw-semibold">
        Showing {startItem}-{endItem} of {safeTotal} {itemLabel}
      </small>
      <Pagination className="custom-pagination mb-0">
        <Pagination.Prev disabled={currentPage === 1} onClick={() => onPageChange(Math.max(currentPage - 1, 1))}>
          <i className="ti ti-chevron-left" />
        </Pagination.Prev>

        {paginationItems.map((item, index) => {
          if (item === 'ellipsis1' || item === 'ellipsis2') {
            return <Pagination.Ellipsis key={`ellipsis-${index}`} disabled />;
          }

          return (
            <Pagination.Item key={item} active={item === currentPage} onClick={() => onPageChange(item)}>
              {item}
            </Pagination.Item>
          );
        })}

        <Pagination.Next disabled={currentPage === pageCount} onClick={() => onPageChange(Math.min(currentPage + 1, pageCount))}>
          <i className="ti ti-chevron-right" />
        </Pagination.Next>
      </Pagination>
    </Stack>
  );
}
