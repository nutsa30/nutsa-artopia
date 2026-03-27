// src/pages/BlogDetailModal.jsx
import React, { useState, useMemo } from 'react';
import styles from './BlogDetailModal.module.css';
import { useNavigate } from 'react-router-dom';
import { useLang } from '../LanguageContext';

const LBL = {
  ka: {
    close: 'დახურვა',
    backToBlogs: 'ბლოგებზე დაბრუნება',
  },
  en: {
    close: 'Close',
    backToBlogs: 'Back to blogs',
  },
};

const BlogDetailModal = ({ blog, onClose }) => {
  const navigate = useNavigate();
  const { lang } = useLang();
  const T = LBL[lang] || LBL.ka;

  // ფოლბექი იმ შემთხვევისთვის, თუ ოდესმე მოდის title_en/title_ka და content_en/content_ka
  const title = useMemo(() => {
    if (!blog) return '';
    if (blog.title) return blog.title;
    if (lang === 'en') return blog.title_en || blog.title_ka || '';
    return blog.title_ka || blog.title_en || '';
  }, [blog, lang]);

  const content = useMemo(() => {
    if (!blog) return '';
    if (blog.content) return blog.content;
    if (lang === 'en') return blog.content_en || blog.content_ka || '';
    return blog.content_ka || blog.content_en || '';
  }, [blog, lang]);

  const [zoomedImage, setZoomedImage] = useState(null);
  const [showZoomed, setShowZoomed] = useState(false);

  const handleClose = () => {
    onClose?.();
    navigate('/blogs'); // ბლოგების გვერდზე დაბრუნება
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
            <div className={styles.zoomedContent} onClick={(e) => e.stopPropagation()}>
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
