import React, { useState, useMemo } from 'react';
import styles from './BlogDetailModal.module.css';
import { useNavigate } from 'react-router-dom';

const LBL = {
  close: 'დახურვა',
  backToBlogs: 'ბლოგებზე დაბრუნება',
};

const BlogDetailModal = ({ blog, onClose }) => {
  const navigate = useNavigate();
  const T = LBL;

  const title = useMemo(() => {
    if (!blog) return '';
    return blog.title || blog.name || '';
  }, [blog]);

  const content = useMemo(() => {
    if (!blog) return '';
    return blog.content || blog.text || '';
  }, [blog]);

  const [zoomedImage, setZoomedImage] = useState(null);
  const [showZoomed, setShowZoomed] = useState(false);

  const handleClose = () => {
    onClose?.();
    navigate('/blogs');
  };

  const handleZoomImage = (src) => {
    setZoomedImage(src);
    setShowZoomed(true);
  };

  const handleCloseZoom = () => {
    setShowZoomed(false);
    setZoomedImage(null);
  };

  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <button
          className={styles.closeBtn}
          onClick={handleClose}
          aria-label={T.close}
          title={T.close}
        >
          ✖
        </button>

        <h2>{title}</h2>
        <p>{content}</p>

        <div className={styles.modalImages}>
          {[...Array(6)].map((_, i) => {
            const key = `image_url${i + 1}`;
            return blog?.[key] ? (
              <img
                key={key}
                src={blog[key]}
                alt={`${title}-img-${i + 1}`}
                className={styles.modalImage}
                onClick={() => handleZoomImage(blog[key])}
              />
            ) : null;
          })}
        </div>

        {/* Zoomed image */}
        {showZoomed && (
          <div className={styles.zoomedOverlay} onClick={handleCloseZoom}>
            <div
              className={styles.zoomedContent}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className={styles.closeBtn}
                onClick={handleCloseZoom}
                aria-label={T.close}
                title={T.close}
              >
                ✖
              </button>
              <img src={zoomedImage} alt="zoomed" className={styles.zoomedImg} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BlogDetailModal;