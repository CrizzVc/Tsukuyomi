import React from 'react';
import imagenBanner from "../assets/img1.jpeg"

function BannerImages() {
    return (
        <div className="mt-10 bannerImg">

            <div className='bannerText'>
                <h1>Animes</h1>
                <h3>Recientemente Agregados</h3>
                <hr className='hrStyle' />
                <button className='bannerBtn' style={{ marginTop: "20px" }}>
                    Explora Catálogo
                </button>
            </div>
            <img src={imagenBanner} alt="" />
        </div>
    );
}

export default BannerImages;
