import {memo, useEffect, useState} from "react";
import CloseRoundedIcon from '@material-ui/icons/CloseRounded';
import "./ImgPreview.css";

// preview an image before send it
export default memo(function ImgPreview({imageSRC, mediaPreview, closeImage}) {
	const [height, setHeight] = useState("");

	useEffect(() => {
		setHeight(document.querySelector('.chat__body--container').offsetHeight);
	}, [])

	return(
		<div 
			ref={mediaPreview} 
			className="mediaPreview"
			style={{
				height: height,
			}}
		>
			<CloseRoundedIcon onClick={closeImage} />
			<img key={imageSRC} src={imageSRC} alt="" />
		</div>
	)
})