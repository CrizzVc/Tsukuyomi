import React, { useState } from 'react';
import imagenBanner from "../assets/img1.jpeg";
import imagenBanner2 from "../assets/img2.jpg";

function BannerImages(props) {
    const [hovered, setHovered] = useState(false);

    return (
        <div className="mt-10 bannerImg">

            <div className='bannerText'>
                <h1>Animes</h1>
                <h3>Recientemente Agregados</h3>
                <hr className='hrStyle' />
                <button
                    className='bannerBtn'
                    style={{ marginTop: "20px" }}
                    onClick={props.onExplore}
                    onMouseEnter={() => setHovered(true)}
                    onMouseLeave={() => setHovered(false)}
                >
                    Explora Catálogo
                </button>
            </div>

            {/* Crossfade container */}
            <div className="bannerImgContainer">
                <img
                    src={imagenBanner}
                    alt="Banner 1"
                    className="bannerImgLayer"
                    style={{ opacity: hovered ? 0 : 1 }}
                />
                <img
                    src={imagenBanner2}
                    alt="Banner 2"
                    className="bannerImgLayer"
                    style={{ opacity: hovered ? 1 : 0 }}
                />
            </div>
        </div>
    );
}

export default BannerImages;
