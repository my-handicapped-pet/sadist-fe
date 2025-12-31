import React from 'react';
import Icon from '../../icon/Icon';

const Footer = () => {
  return <div style={{ textAlign: 'center' }}>
    © 2020 ̶ {new Date().getFullYear()} Ilya Lyaukin |{' '}
    <a href="/tos">TOS</a> | <a href="/privacy-policy">Privacy Policy</a> |{' '}
    <a href="https://blog.my-handicapped-pet.io/" target="_blank"><b>Blog</b></a> |{' '}
    <a href="https://github.com/my-handicapped-pet/sadist-be" target="_blank">
      <img style={{ width: '19px', height: '19px', transform: 'translateY(3px)', marginRight: '5px' }} src={Icon.github}/>
      GitHub
    </a>
  </div>
}

export default Footer;
