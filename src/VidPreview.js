import {memo, useEffect, useState} from "react";
import CloseRoundedIcon from '@material-ui/icons/CloseRounded';
import "./ImgPreview.css";

// preview a video before send it

export default memo(function VidPreview({videoSRC, mediaPreview, closeVideo}) {
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
			<CloseRoundedIcon onClick={closeVideo} />
            <video controls key={videoSRC} src={videoSRC}/>
		</div>
	)
})