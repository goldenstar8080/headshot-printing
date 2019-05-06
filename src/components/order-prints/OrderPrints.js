import React, { Component } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import classNames from 'classnames';
import domtoimage from 'dom-to-image';
import withStyles from "@material-ui/core/styles/withStyles";
import SwipeableViews from 'react-swipeable-views';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import CircularProgress from '@material-ui/core/CircularProgress';
import Paper from '@material-ui/core/Paper';
import ProductionSteper from './ProductionSteper';
import SelectQuantity from './SelectQuantity';
import ProductionUserInfo from './ProductionUserInfo';
import ProductionDesign from './ProductionDesign';
import ProductionOrder from './ProductionOrder';
import ProductProof from './ProductProof';
import StripeCheckoutButton from './stripe/StripeCheckoutButton';
import HeadshotAPI from 'apis/headshotAPIs';
import * as appUtils from 'utils/appUtils';
import * as productionActions from 'actions/productionActions';
import * as globalNotificationActions from 'actions/globalNotificationActions';
import { materialStyles, themeMaterial } from 'styles/material/index';


class OrderPrints extends Component {
  state = {
    loading: false,
    production: null,
    quantityId: null,
    order: null,
    step: 0,
    uploadFile: null,
    uploadImageUrl: null,
    fileName: '',
    email: '',
    headshot: null,
    design: {},
    orderElectronic: {},
    paid: false
  };

  componentWillMount() {
    this.setState({
      loading: true,
      step: 0,
      headshot: null,
    }, () => {
      HeadshotAPI.getProduction(2, this.handleGetProductionResponse);
    });
  }

  handleGetProductionResponse = (response, isFailed) => {
    this.setState({production: response, loading: false});
  };

  handleClickGallery = (productionId) => {
    this.props.onChangeMenu({key: 'imagemap', productionId});
  };

  handleChangeOrder = order => {
    this.setState({ order });
  };

  handleChangeQuantity = quantityId => {
    this.setState({ quantityId });
  };

  handleChangeStep = (step) => {
    this.setState({step});
  }

  handleChange = (name, value) => {
    console.log(name, value);
    this.setState({[name]: value});
  }

  handleChangeIndex = index => {
    this.setState({ step: index });
  };

  validationCheck = () => {
    const { step, email, fileName, uploadFile, quantityId } = this.state;
    let res = false;
    switch(step) {
      case 0:
        res = (quantityId !== null);
        break;
      case 1:
        res = (email && fileName && uploadFile);
        break;
      default: 
        res = true;
        break;
    }
    if (!res) this.props.globalNotificationActions.notify(true, 'error', 'Some data is empty. Please input every items.');
    return res;
  }

  handleNext = () => {
    const { step, email, fileName, quantityId, paid } = this.state;
    if(!this.validationCheck()) return;
    switch (step) {
      case 1:
        // Create new headshot
        this.setState({loading: true}, () => {
          let data = {
            "email": email,
            "file_name": fileName,
            "quantity": quantityId,
            "status": "Draft"
          };
          HeadshotAPI.createHeadshot(data, this.handleCreateHeadshot);
        });
        break;
      case 2:
        // Upload image to cloudinary
        this.handleUploadImage();
        break;
      default:
        this.setState({step: step + 1}, () => {
          this.props.productionActions.setProductionState(this.state);
          if (paid) {
            // Go to home page
            this.props.history.push('/')
          }
        });
        break;
    }
  };

  handleBack = () => {
    this.setState({
      step: this.state.step - 1,
    }, () => {
      this.props.productionActions.setProductionState(this.state);
      if (this.state.step === 1) {
        if (this.state.headshot) HeadshotAPI.deleteHeadshot(this.state.headshot.id, this.handleDeleteHeadshot);
      }
    });
  };

  handleReset = () => {
    this.setState({
      step: 0,
    }, () => {
      this.props.productionActions.setProductionState(this.state);
    });
  };

  handleCreateHeadshot = (response, isFailed) => {
    if (isFailed) {}
    else this.setState({loading: false, headshot: response, step: this.state.step + 1}, () => {
      // Go to next step
      this.props.productionActions.setProductionState(this.state);
    });
  };

  handleDeleteHeadshot = (response, isFailed) => {
    if (isFailed) {}
    else this.setState({loading: false, headshot: response}, () => {
      // Go to next step
      this.props.productionActions.setProductionState(this.state);
    });
  }

  handleUploadImage = () => {
    let node = document.getElementById('preview-headshot');
    const { production } = this.props;
    const __this = this;
    domtoimage.toJpeg(node, { quality: 0.95 })
    .then(function (dataUrl) {
        let img = new Image();
        img.src = dataUrl;
        // Uploading headhost image to cloudinary via backend server
        const uploadDataUrl = dataUrl.replace("data:image/jpg;base64,", "");
        let data = new FormData();
        data.append('file', uploadDataUrl);
        data.append('fileName', 'headshot')
        HeadshotAPI.uploadHeadshotImage(production.headshot.id, data, __this.handleUploadImageResponse);      
    })
    .catch(function (error) {
        console.error('oops, something went wrong!', error);
    });
  }

  handleUploadImageResponse = (response, isFailed) => {
    if(isFailed) {}
    else this.setState({headshot: response, step: this.state.step + 1}, () => {
      // Go to next step
      this.props.productionActions.setProductionState(this.state);
    })
  }

  handleCheckout = (token, isFailed) => {
    if(isFailed) {}
    else {
      this.setState({loading: true}, () => {
        this.props.productionActions.setProductionState(this.state);
      });
    }
  }

  handlePayment = (response, isFailed) => {
    if(isFailed) {}
    else {
      this.setState({loading: false, paid: true, step: this.state.step + 1}, () => {
        this.props.productionActions.setProductionState(this.state);
      });
    }
  }

  renderStepForm = () => {
    const { classes } = this.props;
    const { production, step, order, quantityId, uploadImageUrl } = this.state;
    return (
      
        production ? (
            <SwipeableViews
              axis={themeMaterial.direction === 'rtl' ? 'x-reverse' : 'x'}
              index={step}
              onChangeIndex={this.handleChangeIndex}
            >
              <SelectQuantity
                production={production}
                quantityId={quantityId}
                onChangeQuantity={this.handleChangeQuantity}
                order={order}
                onChangeOrder={this.handleChangeOrder}
              />
              <ProductionUserInfo onChange={this.handleChange} />
              <ProductionDesign photo={uploadImageUrl} onChange={this.handleChange} />
              <ProductionOrder onChange={this.handleChange} />
              <ProductProof data={this.state}/>
            </SwipeableViews>
          ) : (
            <div/>
          )
    );
  }

  render() {
    const { classes } = this.props;
    const { loading, production, step, quantityId, headshot, paid } = this.state;
    // console.log('==== production: ', this);
    let amount = 0;
    let price = 0;
    let fileName = headshot ?  headshot.file_name : '';
    let imageUrl = headshot ? headshot.cloudinary_image_secure_url : '';
    let productionQuantities = [];
    // Get current quantity
    let currentQuantity = null;
    if (production && production.production_quantities) {
      currentQuantity = production.production_quantities.find(quantity => {
        return quantity.id === quantityId;
      });
    }
    if (currentQuantity) {
      amount = currentQuantity.amount;
      price = parseFloat(currentQuantity.plus_price);
    }

    if (!(production && production.production_quantities)) {
      return (
        <Paper className={classes.containerPaper} center="true">
          <CircularProgress size={40} thickness={5} />
        </Paper>
      );
    }
    return (
      <div>
        {/* <div className={classNames(classes.orderPrintsSteperLayout)}> */}
        <div className={classNames(classes.orderContainer)}>
          <Grid container className={classNames(classes.orderPrintsSteperLayout, )}>
            <Grid item lg={1} md={1} sm={12} xs={12}/>
            <Grid item lg={10} md={10} sm={12} xs={12}>
              <Grid container className={classNames(classes.steperGridContainer)}>
                <Grid item xs={6}>
                  <Typography className={classNames(classes.pageTitleText, classes.bold, classes.whiteImportant)}>
                    {`Order Printing`}
                  </Typography>
                </Grid>
                <Grid item xs={6} className={classes.rightText}>
                  <Button
                    variant="outlined"
                    color="primary"
                    size="small"
                    disabled={step === 0}
                    className={classes.nextButton}
                    onClick={this.handleBack}
                  >
                    { 'Back' }
                  </Button>
                  {
                    ((step === appUtils.getSteps().length - 1) && !paid) ? (
                      <StripeCheckoutButton 
                        headshot={headshot} 
                        amount={price} 
                        onCheckout={this.handleCheckout} 
                        onPayment={this.handlePayment}
                      />
                    ) : (
                    <Button
                      variant="contained"
                      color="primary"
                      size="small"
                      className={classes.nextButton}
                      onClick={this.handleNext}
                    >
                      { paid ? 'Finish' : 'Next' }
                    </Button>
                    )
                  }
                </Grid>
                <Grid item xs={12}>
                  <ProductionSteper step={step} onChangeStep={this.handleChangeStep} />
                </Grid>
                {/* <Grid item xs={12}>
                  { this.renderStepForm() }
                </Grid> */}
              </Grid>
            </Grid>
            <Grid item lg={1} md={1} sm={12} xs={12}/>
          </Grid>

          <Grid 
            container direction="column" 
            justify="center" alignItems="center" 
            className={classNames(classes.orderPrintsSteperBody, )}
          >
            <Grid item xs={12}>
              { this.renderStepForm() }
            </Grid>
          </Grid>
        </div>
      </div>
    );
  }
}

function mapStateToProps(state) {
  const { productions, production } = state;
  return {
    productions,
    production
  }
}
  
function mapDispatchToProps(dispatch) {
  return {
    productionActions: bindActionCreators(productionActions, dispatch),
    globalNotificationActions: bindActionCreators(globalNotificationActions, dispatch)
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(withStyles(materialStyles)(OrderPrints));

